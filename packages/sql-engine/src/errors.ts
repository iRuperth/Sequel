import type { RejectionReason } from "@sequel/contracts"

export class SqlRejectedError extends Error {
  constructor(
    public readonly reason: RejectionReason,
    message: string,
    public readonly position: number | null = null,
  ) {
    super(message)
    this.name = "SqlRejectedError"
  }
}

export type PgErrorLike = {
  message: string
  code?: string
  position?: string
  detail?: string
  hint?: string
}

export function isPgError(error: unknown): error is PgErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { code?: unknown }).code === "string"
  )
}
