import type {
  ExecuteQueryResponse,
  ExecutionDetail,
  ExplainResponse,
  HistoryPage,
  HistoryQuery,
  InteractiveExecutionMode,
} from "@sequel/contracts"
import { LIMITS } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import type { SqlEngine } from "@sequel/sql-engine"
import { and, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm"
import { decodeCursor, encodeCursor } from "../../shared/cursor"
import { notFound } from "../../shared/errors"
import type { ActivityService } from "../activity/service"
import type { SandboxService } from "../sandbox/service"
import type { WarehouseService } from "../warehouse/service"
import { presentError, toExecutionDetail, toExecutionSummary } from "./mapper"
import type { ExecutionRecorder } from "./recorder"

export type ExecuteInput = {
  userId: string
  sql: string
  mode: InteractiveExecutionMode
  requestId?: string
}

export class QueryService {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly sandbox: SandboxService,
    private readonly recorder: ExecutionRecorder,
    private readonly activity: ActivityService,
  ) {}

  async execute(input: ExecuteInput): Promise<ExecuteQueryResponse> {
    const session =
      input.mode === "scratch"
        ? await this.sandbox.ensure(input.userId)
        : await this.sandbox.active(input.userId)
    const scratchSchema = session?.schemaName ?? null
    const outcome = await this.engine.runner.execute({
      sql: input.sql,
      mode: input.mode,
      searchPath: await this.warehouse.searchPath(scratchSchema),
      ownedSchemas: scratchSchema ? [scratchSchema] : [],
      requestId: input.requestId,
    })
    if (input.mode === "scratch" && outcome.statementCount > 0) {
      await this.warehouse.invalidateSchemaTree(scratchSchema)
    }
    const row = await this.recorder.record({
      userId: input.userId,
      sql: input.sql,
      mode: input.mode,
      source: "workbench",
      outcome,
      sandboxSessionId: session?.id ?? null,
    })
    await this.activity.record(input.userId, { queriesRun: 1 })
    return {
      execution: toExecutionSummary(row),
      result: outcome.result,
      error: presentError(outcome.error),
    }
  }

  async explain(
    userId: string,
    sql: string,
    analyze: boolean,
    requestId?: string,
  ): Promise<ExplainResponse> {
    const session = await this.sandbox.active(userId)
    const scratchSchema = session?.schemaName ?? null
    const outcome = await this.engine.runner.explain({
      sql,
      analyze,
      role: scratchSchema ? "writer" : "reader",
      searchPath: await this.warehouse.searchPath(scratchSchema),
      ownedSchemas: scratchSchema ? [scratchSchema] : [],
      requestId,
    })
    const row = await this.recorder.record({
      userId,
      sql,
      mode: "explain",
      source: "workbench",
      outcome: { ...outcome, result: null },
      sandboxSessionId: session?.id ?? null,
    })
    await this.activity.record(userId, { queriesRun: 1 })
    return {
      execution: toExecutionSummary(row),
      plan: outcome.plan,
      error: presentError(outcome.error),
    }
  }

  async cancel(requestId: string): Promise<boolean> {
    return this.engine.runner.cancel(requestId)
  }

  async history(userId: string, query: HistoryQuery): Promise<HistoryPage> {
    const limit = query.limit ?? LIMITS.historyPageSizeDefault
    const cursor = decodeCursor(query.cursor)
    const filters: SQL[] = [eq(tables.queryExecutions.userId, userId)]
    if (query.status) {
      filters.push(eq(tables.queryExecutions.status, query.status))
    }
    if (query.source) {
      filters.push(eq(tables.queryExecutions.source, query.source))
    }
    if (query.search) {
      filters.push(ilike(tables.queryExecutions.sqlText, `%${query.search}%`))
    }
    if (cursor) {
      const before = or(
        lt(tables.queryExecutions.executedAt, cursor.at),
        and(
          eq(tables.queryExecutions.executedAt, cursor.at),
          lt(tables.queryExecutions.id, cursor.id),
        ),
      )
      if (before) {
        filters.push(before)
      }
    }
    const rows = await this.db
      .select()
      .from(tables.queryExecutions)
      .where(and(...filters))
      .orderBy(desc(tables.queryExecutions.executedAt), desc(tables.queryExecutions.id))
      .limit(limit + 1)
    const page = rows.slice(0, limit)
    const last = page.at(-1)
    return {
      items: page.map(toExecutionSummary),
      nextCursor:
        rows.length > limit && last ? encodeCursor({ at: last.executedAt, id: last.id }) : null,
    }
  }

  async detail(userId: string, id: string): Promise<ExecutionDetail> {
    const row = await this.db.query.queryExecutions.findFirst({
      where: and(eq(tables.queryExecutions.id, id), eq(tables.queryExecutions.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return toExecutionDetail(row)
  }
}
