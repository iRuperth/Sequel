import type { ExecutionMode, ExplainPlan, ResultSet, SqlError } from "@sequel/contracts"
import type pg from "pg"
import { classify, type ClassifiedStatement } from "./classify"
import { SQLSTATE } from "./constants"
import { parseExplainOutput } from "./explain"
import { elapsedSince, statusForError, toSqlError, type ExecutionOutcome } from "./outcome"
import type { SqlParser } from "./parser"
import type { SandboxPools, SandboxRole } from "./pools"
import type { ResultLimits } from "./results"
import { runStatement } from "./session"
import type { TypeNameRegistry } from "./type-names"

export type RunnerSettings = ResultLimits & {
  fetchChunk: number
  statementTimeoutMs: number
  cancelGraceMs: number
  maxStatementsPerRun: number
}

export type ExecuteRequest = {
  sql: string
  mode: Exclude<ExecutionMode, "explain">
  searchPath: readonly string[]
  ownedSchemas: readonly string[]
  statementTimeoutMs?: number
  maxRows?: number
  requestId?: string
  commit?: boolean
  followUpSql?: string
}

export type ExplainRequest = {
  sql: string
  analyze: boolean
  role: Exclude<SandboxRole, "admin">
  searchPath: readonly string[]
  ownedSchemas: readonly string[]
  requestId?: string
}

export type ExplainOutcome = Omit<ExecutionOutcome, "result"> & { plan: ExplainPlan | null }

type RunningQuery = { pid: number; cancelled: boolean; terminated: boolean }

type SessionOptions = {
  role: Exclude<SandboxRole, "admin">
  readOnly: boolean
  searchPath: readonly string[]
  timeoutMs: number
  requestId: string | undefined
}

export class SqlRunner {
  private readonly running = new Map<string, RunningQuery>()

  constructor(
    private readonly parser: SqlParser,
    private readonly pools: SandboxPools,
    private readonly typeNames: TypeNameRegistry,
    private readonly settings: RunnerSettings,
  ) {}

  async execute(request: ExecuteRequest): Promise<ExecutionOutcome> {
    await this.parser.ready()
    const started = performance.now()
    const classification = classify(this.parser, request.sql, {
      mode: request.mode,
      maxStatements: this.settings.maxStatementsPerRun,
      ownedSchemas: request.ownedSchemas,
    })
    if (!classification.ok) {
      return rejectedOutcome(started, classification)
    }
    const followUp = request.followUpSql ? this.classifyFollowUp(request) : null
    if (followUp && !followUp.ok) {
      return rejectedOutcome(started, followUp)
    }
    const isScratch = request.mode === "scratch"
    const limits = {
      maxRows: request.maxRows ?? this.settings.maxRows,
      maxBytes: this.settings.maxBytes,
      maxCellChars: this.settings.maxCellChars,
      fetchChunk: this.settings.fetchChunk,
    }
    const statements: ClassifiedStatement[] = [
      ...classification.statements,
      ...(followUp?.ok
        ? followUp.statements.map((statement) => ({ ...statement, start: -1 }))
        : []),
    ]
    const commit = request.commit ?? isScratch

    return this.withSession(
      {
        role: isScratch ? "writer" : "reader",
        readOnly: !isScratch,
        searchPath: request.searchPath,
        timeoutMs: request.statementTimeoutMs ?? this.settings.statementTimeoutMs,
        requestId: request.requestId,
      },
      started,
      async (client) => {
        let last: ResultSet | null = null
        let lastRowResult: ResultSet | null = null
        for (const [index, statement] of statements.entries()) {
          try {
            last = await runStatement(client, statement, limits, this.typeNames)
            if (statement.returnsRows) {
              lastRowResult = last
            }
          } catch (error) {
            throw new StatementFailure(error, Math.max(0, statement.start), index)
          }
        }
        return {
          result: lastRowResult ?? last,
          statementCount: classification.statements.length,
          commit,
        }
      },
    )
  }

  async explain(request: ExplainRequest): Promise<ExplainOutcome> {
    await this.parser.ready()
    const started = performance.now()
    const classification = classify(this.parser, request.sql, {
      mode: "explain",
      maxStatements: 1,
      ownedSchemas: request.ownedSchemas,
    })
    if (!classification.ok) {
      const outcome = rejectedOutcome(started, classification)
      return { ...outcome, plan: null }
    }
    const statement = classification.statements[0]
    if (!statement || statement.kind === "ExplainStmt" || statement.kind === "VariableShowStmt") {
      const outcome = rejectedOutcome(started, {
        ok: false,
        reason: "statement_not_allowed",
        detail: statement?.kind ?? null,
        position: 1,
      })
      return { ...outcome, plan: null }
    }
    const options = request.analyze ? "FORMAT JSON, ANALYZE, BUFFERS" : "FORMAT JSON"
    const prefix = `EXPLAIN (${options}) `
    const outcome = await this.withSession(
      {
        role: request.role,
        readOnly: true,
        searchPath: request.searchPath,
        timeoutMs: this.settings.statementTimeoutMs,
        requestId: request.requestId,
      },
      started,
      async (client) => {
        try {
          const result = await client.query<{ "QUERY PLAN": unknown }>(`${prefix}${statement.text}`)
          return {
            result: null,
            statementCount: 1,
            commit: false,
            plan: result.rows[0]?.["QUERY PLAN"],
          }
        } catch (error) {
          throw new StatementFailure(error, statement.start - prefix.length, 0)
        }
      },
    )
    const plan = outcome.raw === undefined ? null : parseExplainOutput(outcome.raw, request.analyze)
    return {
      status: outcome.status,
      durationMs: outcome.durationMs,
      statementCount: outcome.statementCount,
      error: outcome.error,
      plan,
    }
  }

  async cancel(requestId: string): Promise<boolean> {
    const running = this.running.get(requestId)
    if (!running) {
      return false
    }
    running.cancelled = true
    await this.pools.admin.query("SELECT pg_cancel_backend($1)", [running.pid])
    return true
  }

  isRunning(requestId: string): boolean {
    return this.running.has(requestId)
  }

  private classifyFollowUp(request: ExecuteRequest) {
    return classify(this.parser, request.followUpSql ?? "", {
      mode: "read",
      maxStatements: 1,
      ownedSchemas: request.ownedSchemas,
    })
  }

  private async withSession<
    T extends { result: ResultSet | null; statementCount: number; commit: boolean; plan?: unknown },
  >(
    options: SessionOptions,
    started: number,
    work: (client: pg.PoolClient) => Promise<T>,
  ): Promise<ExecutionOutcome & { raw?: unknown }> {
    const client = await this.pools.pool(options.role).connect()
    const key = options.requestId ?? crypto.randomUUID()
    let watchdog: NodeJS.Timeout | undefined
    let destroy = false
    try {
      await client.query(options.readOnly ? "BEGIN READ ONLY" : "BEGIN")
      await client.query(`SET LOCAL statement_timeout = ${Math.trunc(options.timeoutMs)}`)
      await client.query(
        `SET LOCAL search_path TO ${options.searchPath.map((schema) => client.escapeIdentifier(schema)).join(", ") || "pg_catalog"}`,
      )
      const pidResult = await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")
      const running: RunningQuery = {
        pid: Number(pidResult.rows[0]?.pid),
        cancelled: false,
        terminated: false,
      }
      this.running.set(key, running)
      watchdog = setTimeout(() => {
        running.terminated = true
        void this.forceStop(running.pid)
      }, options.timeoutMs + this.settings.cancelGraceMs)

      try {
        const output = await work(client)
        await client.query(output.commit ? "COMMIT" : "ROLLBACK")
        return {
          status: "succeeded",
          durationMs: elapsedSince(started),
          statementCount: output.statementCount,
          result: output.result,
          error: null,
          raw: output.plan,
        }
      } catch (error) {
        const failure =
          error instanceof StatementFailure ? error : new StatementFailure(error, 0, null)
        const sqlError = toSqlError(failure.cause, failure.offset, failure.statementIndex)
        await client.query("ROLLBACK").catch(() => {
          destroy = true
        })
        if (sqlError.sqlState !== SQLSTATE.queryCanceled && running.terminated) {
          destroy = true
        }
        return {
          status: statusForError(sqlError, running.cancelled, running.terminated),
          durationMs: elapsedSince(started),
          statementCount: (failure.statementIndex ?? 0) + 1,
          result: null,
          error: sqlError,
        }
      }
    } finally {
      clearTimeout(watchdog)
      this.running.delete(key)
      client.release(destroy)
    }
  }

  private async forceStop(pid: number) {
    await this.pools.admin.query("SELECT pg_cancel_backend($1)", [pid]).catch(() => undefined)
    setTimeout(() => {
      void this.pools.admin.query("SELECT pg_terminate_backend($1)", [pid]).catch(() => undefined)
    }, this.settings.cancelGraceMs).unref()
  }
}

class StatementFailure extends Error {
  constructor(
    override readonly cause: unknown,
    readonly offset: number,
    readonly statementIndex: number | null,
  ) {
    super(cause instanceof Error ? cause.message : String(cause))
  }
}

function rejectedOutcome(
  started: number,
  rejection: {
    ok: false
    reason: SqlError["rejectionReason"]
    detail: string | null
    position: number | null
  },
): ExecutionOutcome {
  return {
    status: "rejected",
    durationMs: elapsedSince(started),
    statementCount: 0,
    result: null,
    error: {
      message: rejection.detail ?? rejection.reason ?? "rejected",
      sqlState: null,
      position: rejection.position,
      detail: rejection.detail,
      hint: null,
      statementIndex: null,
      rejectionReason: rejection.reason,
    },
  }
}
