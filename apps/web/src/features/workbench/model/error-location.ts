import type { ErrorLocation } from "./run-store"

export function locateError(
  document: string,
  executedOffset: number,
  position: number | null,
): ErrorLocation | null {
  if (position === null || position < 1) {
    return null
  }
  const offset = Math.min(executedOffset + position - 1, Math.max(document.length - 1, 0))
  const before = document.slice(0, offset)
  const lines = before.split("\n")
  return {
    offset,
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  }
}
