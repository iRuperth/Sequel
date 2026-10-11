import type { SqlError } from "@sequel/contracts"

const POSITION_BASE = 1

export function errorOffsetFor(error: SqlError | null | undefined, base = 0): number | null {
  if (!error || error.position === null) {
    return null
  }
  return base + Math.max(error.position - POSITION_BASE, 0)
}

export function lineAndColumn(sql: string, offset: number): { line: number; column: number } {
  const before = sql.slice(0, Math.max(offset, 0))
  const lines = before.split("\n")
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + POSITION_BASE }
}
