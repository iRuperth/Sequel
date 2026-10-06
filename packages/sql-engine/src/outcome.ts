import type { ExecutionStatus, ResultSet, SqlError } from "@sequel/contracts"
import { SQLSTATE } from "./constants"
import { isPgError } from "./errors"

export type ExecutionOutcome = {
  status: ExecutionStatus
  durationMs: number
  statementCount: number
  result: ResultSet | null
  error: SqlError | null
}

export function elapsedSince(started: number): number {
  return Math.round(performance.now() - started)
}

export function toSqlError(
  error: unknown,
  statementOffset: number,
  statementIndex: number | null,
): SqlError {
  if (isPgError(error)) {
    const relative = error.position ? Number(error.position) : null
    return {
      message: error.message,
      sqlState: error.code ?? null,
      position: relative === null ? null : statementOffset + relative,
      detail: error.detail ?? null,
      hint: error.hint ?? null,
      statementIndex,
      rejectionReason: null,
    }
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    sqlState: null,
    position: null,
    detail: null,
    hint: null,
    statementIndex,
    rejectionReason: null,
  }
}

export function statusForError(
  error: SqlError,
  wasCancelled: boolean,
  wasTerminated: boolean,
): ExecutionStatus {
  if (wasCancelled) {
    return "cancelled"
  }
  if (wasTerminated || error.sqlState === SQLSTATE.queryCanceled) {
    return "timed_out"
  }
  return "failed"
}
