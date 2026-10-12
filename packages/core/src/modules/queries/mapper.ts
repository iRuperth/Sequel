import type { ExecutionDetail, ExecutionSummary, SqlError } from "@sequel/contracts"
import { rejectionReasonLabels } from "@sequel/copy"
import type { queryExecutions } from "@sequel/db"
import { iso } from "../../shared/time"

type ExecutionRow = typeof queryExecutions.$inferSelect

export function toExecutionSummary(row: ExecutionRow): ExecutionSummary {
  return {
    id: row.id,
    sqlText: row.sqlText,
    mode: row.mode,
    status: row.status,
    source: row.source,
    durationMs: row.durationMs,
    rowCount: row.rowCount,
    truncated: row.rowsTruncated,
    statementCount: row.statementCount,
    errorMessage: row.errorMessage,
    rejectionReason: row.rejectionReason,
    taskId: row.taskId,
    executedAt: iso(row.executedAt),
  }
}

export function toExecutionDetail(row: ExecutionRow): ExecutionDetail {
  return {
    ...toExecutionSummary(row),
    columns: row.columns ?? null,
    errorDetail: row.errorDetail,
    errorPosition: row.errorPosition,
  }
}

export function presentError(error: SqlError | null): SqlError | null {
  if (!error || !error.rejectionReason) {
    return error
  }
  return {
    ...error,
    message: rejectionReasonLabels[error.rejectionReason],
    detail: error.detail,
  }
}
