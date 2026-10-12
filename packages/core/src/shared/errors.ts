import type { ApiErrorCode } from "@sequel/contracts"
import { apiErrorMessages } from "@sequel/copy"

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation_failed: 400,
  not_found: 404,
  conflict: 409,
  sql_rejected: 422,
  sql_timeout: 408,
  sql_error: 422,
  sql_cancelled: 409,
  llm_not_configured: 503,
  llm_failed: 502,
  sandbox_session_required: 409,
  service_unavailable: 503,
  internal_error: 500,
}

export class AppError extends Error {
  readonly status: number

  constructor(
    readonly code: ApiErrorCode,
    detail?: string,
  ) {
    super(detail ?? apiErrorMessages[code])
    this.name = "AppError"
    this.status = STATUS_BY_CODE[code]
  }
}

export const notFound = (detail?: string) => new AppError("not_found", detail)
export const conflict = (detail?: string) => new AppError("conflict", detail)
export const invalid = (detail?: string) => new AppError("validation_failed", detail)

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
