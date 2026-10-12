import type { ExecutionMode, ExecutionSource } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import type { ExecutionOutcome } from "@sequel/sql-engine"
import { presentError } from "./mapper"

export type RecordInput = {
  userId: string
  sql: string
  mode: ExecutionMode
  source: ExecutionSource
  outcome: Pick<ExecutionOutcome, "status" | "durationMs" | "statementCount" | "error"> & {
    result: ExecutionOutcome["result"]
  }
  taskId?: string | null
  sandboxSessionId?: string | null
}

export class ExecutionRecorder {
  constructor(private readonly db: Database) {}

  async record(input: RecordInput) {
    const error = presentError(input.outcome.error)
    const [row] = await this.db
      .insert(tables.queryExecutions)
      .values({
        userId: input.userId,
        sqlText: input.sql,
        mode: input.mode,
        status: input.outcome.status,
        source: input.source,
        rejectionReason: error?.rejectionReason ?? null,
        errorMessage: error?.message ?? null,
        errorDetail: error?.detail ?? null,
        errorPosition: error?.position ?? null,
        sqlState: error?.sqlState ?? null,
        durationMs: input.outcome.durationMs,
        rowCount: input.outcome.result?.rowCount ?? null,
        rowsTruncated: input.outcome.result?.truncated ?? false,
        statementCount: Math.max(1, input.outcome.statementCount),
        columns: input.outcome.result?.columns ?? null,
        taskId: input.taskId ?? null,
        sandboxSessionId: input.sandboxSessionId ?? null,
      })
      .returning()
    if (!row) {
      throw new Error("Failed to record execution")
    }
    return row
  }
}
