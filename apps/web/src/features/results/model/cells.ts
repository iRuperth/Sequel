import type { CellValue } from "@sequel/contracts"
import { copy } from "@sequel/copy"

const NUMERIC_TYPES = new Set([
  "int2",
  "int4",
  "int8",
  "smallint",
  "integer",
  "bigint",
  "numeric",
  "decimal",
  "float4",
  "float8",
  "real",
  "double precision",
  "money",
  "oid",
  "serial",
  "bigserial",
])

const BOOLEAN_TYPES = new Set(["bool", "boolean"])

export type CellKind = "number" | "boolean" | "text"

export function normalizeType(dataType: string | null | undefined): string {
  return (dataType ?? "")
    .toLowerCase()
    .replace(/\(.*\)$/, "")
    .replace(/\[\]$/, "")
    .trim()
}

export function cellKind(dataType: string | null | undefined, value?: CellValue): CellKind {
  const type = normalizeType(dataType)
  if (NUMERIC_TYPES.has(type) || (!type && typeof value === "number")) {
    return "number"
  }
  if (BOOLEAN_TYPES.has(type) || (!type && typeof value === "boolean")) {
    return "boolean"
  }
  return "text"
}

export function isNumericType(dataType: string | null | undefined): boolean {
  return NUMERIC_TYPES.has(normalizeType(dataType))
}

export function cellDisplay(value: CellValue): string {
  if (value === null) {
    return copy.common.nullValue
  }
  if (typeof value === "boolean") {
    return value ? copy.common.true : copy.common.false
  }
  return String(value)
}

export function cellClipboardText(value: CellValue): string {
  if (value === null) {
    return ""
  }
  return String(value)
}

const CHAR_WIDTH_PX = 7.4
const CELL_PADDING_PX = 24

export function estimateColumnWidth(
  name: string,
  dataType: string,
  sample: readonly CellValue[],
  minWidth: number,
  maxWidth: number,
): number {
  let longest = Math.max(name.length, dataType.length + 2)
  for (const value of sample) {
    const length = cellDisplay(value).length
    if (length > longest) {
      longest = length
    }
  }
  return Math.round(
    Math.min(Math.max(longest * CHAR_WIDTH_PX + CELL_PADDING_PX, minWidth), maxWidth),
  )
}
