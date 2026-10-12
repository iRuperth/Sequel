import type {
  RunStatus,
  ScheduledQuery,
  ScheduledRun,
  UpsertScheduledQueryRequest,
} from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { SCHEDULER_KEYS, type JobProducer } from "@sequel/queue"
import type { SqlEngine } from "@sequel/sql-engine"
import { and, desc, eq } from "drizzle-orm"
import { notFound } from "../../shared/errors"
import type { Logger } from "../../shared/logger"
import { iso, isoOrNull } from "../../shared/time"
import type { JobService } from "../jobs/service"
import type { ExecutionRecorder } from "../queries/recorder"
import type { SavedQueryService } from "../saved-queries/service"
import type { WarehouseService } from "../warehouse/service"
import { assertValidTimezone, nextRun } from "./cron"

type ScheduleRow = typeof tables.scheduledQueries.$inferSelect

const RUN_HISTORY_LIMIT = 50

export class ScheduledQueryService {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly savedQueries: SavedQueryService,
    private readonly recorder: ExecutionRecorder,
    private readonly jobs: JobService,
    private readonly producer: JobProducer,
    private readonly maxRows: number,
    private readonly logger: Logger,
  ) {}

  async list(userId: string): Promise<ScheduledQuery[]> {
    const rows = await this.db
      .select({ schedule: tables.scheduledQueries, queryName: tables.savedQueries.name })
      .from(tables.scheduledQueries)
      .innerJoin(
        tables.savedQueries,
        eq(tables.savedQueries.id, tables.scheduledQueries.savedQueryId),
      )
      .where(eq(tables.scheduledQueries.userId, userId))
      .orderBy(desc(tables.scheduledQueries.createdAt))
    return Promise.all(rows.map(({ schedule, queryName }) => this.present(schedule, queryName)))
  }

  async get(userId: string, id: string): Promise<ScheduledQuery> {
    const row = await this.row(userId, id)
    const query = await this.savedQueries.row(userId, row.savedQueryId)
    return this.present(row, query.name)
  }

  async create(userId: string, input: UpsertScheduledQueryRequest): Promise<ScheduledQuery> {
    await this.savedQueries.row(userId, input.savedQueryId)
    assertValidTimezone(input.timezone)
    const next = nextRun(input.cronExpression, input.timezone)
    const [row] = await this.db
      .insert(tables.scheduledQueries)
      .values({ userId, ...input, nextRunAt: input.isEnabled ? next : null })
      .returning()
    if (!row) {
      throw new Error("Failed to create schedule")
    }
    await this.sync(row)
    return this.get(userId, row.id)
  }

  async update(
    userId: string,
    id: string,
    input: UpsertScheduledQueryRequest,
  ): Promise<ScheduledQuery> {
    await this.row(userId, id)
    await this.savedQueries.row(userId, input.savedQueryId)
    assertValidTimezone(input.timezone)
    const next = nextRun(input.cronExpression, input.timezone)
    const [row] = await this.db
      .update(tables.scheduledQueries)
      .set({ ...input, nextRunAt: input.isEnabled ? next : null })
      .where(eq(tables.scheduledQueries.id, id))
      .returning()
    if (!row) {
      throw notFound()
    }
    await this.sync(row)
    return this.get(userId, id)
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.row(userId, id)
    await this.producer.removeSchedule(
      "scheduled_query",
      `${SCHEDULER_KEYS.scheduledQueryPrefix}${row.id}`,
    )
    await this.db.delete(tables.scheduledQueries).where(eq(tables.scheduledQueries.id, id))
  }

  async trigger(userId: string, id: string): Promise<string> {
    await this.row(userId, id)
    return this.jobs.enqueue("scheduled_query", { scheduledQueryId: id }, { userId, subjectId: id })
  }

  async runs(userId: string, id: string): Promise<ScheduledRun[]> {
    await this.row(userId, id)
    const rows = await this.db
      .select()
      .from(tables.scheduledQueryRuns)
      .where(eq(tables.scheduledQueryRuns.scheduledQueryId, id))
      .orderBy(desc(tables.scheduledQueryRuns.startedAt))
      .limit(RUN_HISTORY_LIMIT)
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      rowCount: row.rowCount,
      durationMs: row.durationMs,
      error: row.error,
      startedAt: iso(row.startedAt),
      finishedAt: isoOrNull(row.finishedAt),
    }))
  }

  async execute(id: string): Promise<RunStatus> {
    const schedule = await this.db.query.scheduledQueries.findFirst({
      where: eq(tables.scheduledQueries.id, id),
    })
    if (!schedule) {
      return "failed"
    }
    const query = await this.savedQueries.row(schedule.userId, schedule.savedQueryId)
    const [run] = await this.db
      .insert(tables.scheduledQueryRuns)
      .values({ scheduledQueryId: id, status: "running" })
      .returning()
    const outcome = await this.engine.runner.execute({
      sql: query.sqlText,
      mode: "read",
      searchPath: await this.warehouse.searchPath(null),
      ownedSchemas: [],
      maxRows: this.maxRows,
    })
    const execution = await this.recorder.record({
      userId: schedule.userId,
      sql: query.sqlText,
      mode: "read",
      source: "scheduled",
      outcome,
    })
    const status: RunStatus = outcome.status === "succeeded" ? "succeeded" : "failed"
    if (run) {
      await this.db
        .update(tables.scheduledQueryRuns)
        .set({
          status,
          executionId: execution.id,
          rowCount: outcome.result?.rowCount ?? null,
          durationMs: outcome.durationMs,
          error: outcome.error?.message ?? null,
          finishedAt: new Date(),
        })
        .where(eq(tables.scheduledQueryRuns.id, run.id))
    }
    await this.db
      .update(tables.scheduledQueries)
      .set({
        lastRunAt: new Date(),
        nextRunAt: schedule.isEnabled ? nextRun(schedule.cronExpression, schedule.timezone) : null,
      })
      .where(eq(tables.scheduledQueries.id, id))
    await this.savedQueries.markRun(query.id)
    return status
  }

  async syncAll(): Promise<void> {
    const rows = await this.db.select().from(tables.scheduledQueries)
    for (const row of rows) {
      await this.sync(row)
    }
    this.logger.info({ schedules: rows.length }, "scheduled queries synchronised")
  }

  private async sync(row: ScheduleRow): Promise<void> {
    const schedulerId = `${SCHEDULER_KEYS.scheduledQueryPrefix}${row.id}`
    if (!row.isEnabled) {
      await this.producer.removeSchedule("scheduled_query", schedulerId)
      return
    }
    await this.producer.upsertSchedule(
      "scheduled_query",
      { scheduledQueryId: row.id },
      { schedulerId, pattern: row.cronExpression, timezone: row.timezone },
    )
  }

  private async present(row: ScheduleRow, savedQueryName: string): Promise<ScheduledQuery> {
    const last = await this.db.query.scheduledQueryRuns.findFirst({
      where: eq(tables.scheduledQueryRuns.scheduledQueryId, row.id),
      orderBy: desc(tables.scheduledQueryRuns.startedAt),
    })
    return {
      id: row.id,
      name: row.name,
      savedQueryId: row.savedQueryId,
      savedQueryName,
      cronExpression: row.cronExpression,
      timezone: row.timezone,
      isEnabled: row.isEnabled,
      lastRunAt: isoOrNull(row.lastRunAt),
      lastStatus: last?.status ?? null,
      nextRunAt: isoOrNull(row.nextRunAt),
      createdAt: iso(row.createdAt),
    }
  }

  private async row(userId: string, id: string): Promise<ScheduleRow> {
    const row = await this.db.query.scheduledQueries.findFirst({
      where: and(eq(tables.scheduledQueries.id, id), eq(tables.scheduledQueries.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return row
  }
}
