export const LLM_ERROR_KINDS = [
  "not_configured",
  "authentication",
  "rate_limited",
  "unavailable",
  "refused",
  "truncated",
  "invalid_output",
  "bad_request",
] as const
export type LlmErrorKind = (typeof LLM_ERROR_KINDS)[number]

const RETRYABLE: ReadonlySet<LlmErrorKind> = new Set([
  "rate_limited",
  "unavailable",
  "truncated",
  "invalid_output",
  "refused",
])

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = "LlmError"
  }

  get retryable(): boolean {
    return RETRYABLE.has(this.kind)
  }
}

export function isLlmError(error: unknown): error is LlmError {
  return error instanceof LlmError
}
