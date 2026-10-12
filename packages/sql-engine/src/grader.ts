import { createHash } from "node:crypto"
import type { CellValue, ColumnMeta, ComparisonNote } from "@sequel/contracts"
import { NUMERIC_TYPE_NAMES } from "./constants"

export type GradableResult = {
  columns: readonly ColumnMeta[]
  rows: readonly (readonly CellValue[])[]
  truncated: boolean
}

export type GradeOptions = {
  orderMatters: boolean
  numericScale: number
  sampleSize: number
}

export type GradeReport = {
  passed: boolean
  orderChecked: boolean
  columnsMatch: boolean
  matchedByName: boolean
  expectedColumns: string[]
  actualColumns: string[]
  expectedRowCount: number
  actualRowCount: number
  missingRowCount: number
  extraRowCount: number
  firstMismatchIndex: number | null
  sampleMissing: CellValue[][]
  sampleExtra: CellValue[][]
  notes: ComparisonNote[]
}

const NULL_TOKEN = "\u0000null"

function isNumericType(name: string): boolean {
  return NUMERIC_TYPE_NAMES.has(name) || name.startsWith("numeric") || name.startsWith("double")
}

function canonicalCell(value: CellValue, numeric: boolean, scale: number): string {
  if (value === null) {
    return NULL_TOKEN
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (numeric) {
    const parsed = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(parsed)) {
      const rounded = Number(parsed.toFixed(scale))
      return Object.is(rounded, -0) ? "0" : String(rounded)
    }
  }
  return String(value).trim()
}

function canonicalRows(
  rows: readonly (readonly CellValue[])[],
  order: readonly number[],
  numericColumns: readonly boolean[],
  scale: number,
): string[] {
  return rows.map((row) =>
    JSON.stringify(
      order.map((index, position) =>
        canonicalCell(row[index] ?? null, numericColumns[position] ?? false, scale),
      ),
    ),
  )
}

function columnOrder(expected: readonly ColumnMeta[], actual: readonly ColumnMeta[]) {
  const expectedNames = expected.map((column) => column.name.toLowerCase())
  const actualNames = actual.map((column) => column.name.toLowerCase())
  const unique = new Set(actualNames).size === actualNames.length
  const byName = expectedNames.map((name) => actualNames.indexOf(name))
  if (unique && byName.every((index) => index >= 0)) {
    const positional = byName.every((index, position) => index === position)
    return { order: byName, matchedByName: !positional }
  }
  return { order: expected.map((_column, index) => index), matchedByName: false }
}

function multisetDifference(left: readonly string[], right: readonly string[]): string[] {
  const counts = new Map<string, number>()
  for (const key of right) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const difference: string[] = []
  for (const key of left) {
    const count = counts.get(key) ?? 0
    if (count > 0) {
      counts.set(key, count - 1)
    } else {
      difference.push(key)
    }
  }
  return difference
}

function decode(row: string): CellValue[] {
  return (JSON.parse(row) as string[]).map((cell) => (cell === NULL_TOKEN ? null : cell))
}

export function gradeResults(
  expected: GradableResult,
  actual: GradableResult,
  options: GradeOptions,
): GradeReport {
  const expectedColumns = expected.columns.map((column) => column.name)
  const actualColumns = actual.columns.map((column) => column.name)
  const notes: ComparisonNote[] = []
  const base = {
    orderChecked: options.orderMatters,
    expectedColumns,
    actualColumns,
    expectedRowCount: expected.rows.length,
    actualRowCount: actual.rows.length,
  }

  if (expected.columns.length !== actual.columns.length) {
    notes.push("column_count_mismatch")
    return {
      ...base,
      passed: false,
      columnsMatch: false,
      matchedByName: false,
      missingRowCount: expected.rows.length,
      extraRowCount: actual.rows.length,
      firstMismatchIndex: 0,
      sampleMissing: expected.rows.slice(0, options.sampleSize).map((row) => [...row]),
      sampleExtra: actual.rows.slice(0, options.sampleSize).map((row) => [...row]),
      notes,
    }
  }

  const { order, matchedByName } = columnOrder(expected.columns, actual.columns)
  if (matchedByName) {
    notes.push("columns_matched_by_name")
  }
  const namesDiffer = expectedColumns.some(
    (name, index) => name.toLowerCase() !== actualColumns[order[index] ?? index]?.toLowerCase(),
  )
  if (namesDiffer) {
    notes.push("column_names_differ")
  }
  if (actual.truncated) {
    notes.push("result_truncated")
  }

  const numericColumns = expected.columns.map((column, index) => {
    const actualType = actual.columns[order[index] ?? index]?.dataType ?? ""
    return isNumericType(column.dataType) || isNumericType(actualType)
  })
  const identity = expected.columns.map((_column, index) => index)
  const expectedKeys = canonicalRows(expected.rows, identity, numericColumns, options.numericScale)
  const actualKeys = canonicalRows(actual.rows, order, numericColumns, options.numericScale)

  const missing = multisetDifference(expectedKeys, actualKeys)
  const extra = multisetDifference(actualKeys, expectedKeys)
  if (expectedKeys.length !== actualKeys.length) {
    notes.push("row_count_mismatch")
  }

  let firstMismatchIndex: number | null = null
  const longest = Math.max(expectedKeys.length, actualKeys.length)
  for (let index = 0; index < longest; index += 1) {
    if (expectedKeys[index] !== actualKeys[index]) {
      firstMismatchIndex = index
      break
    }
  }
  const sameMultiset = missing.length === 0 && extra.length === 0
  if (options.orderMatters && sameMultiset && firstMismatchIndex !== null) {
    notes.push("row_order_differs")
  }
  const passed =
    sameMultiset && !actual.truncated && (!options.orderMatters || firstMismatchIndex === null)

  return {
    ...base,
    passed,
    columnsMatch: true,
    matchedByName,
    missingRowCount: missing.length,
    extraRowCount: extra.length,
    firstMismatchIndex: passed ? null : firstMismatchIndex,
    sampleMissing: missing.slice(0, options.sampleSize).map(decode),
    sampleExtra: extra.slice(0, options.sampleSize).map(decode),
    notes,
  }
}

export function resultDigest(
  result: GradableResult,
  orderMatters: boolean,
  numericScale: number,
): string {
  const numericColumns = result.columns.map((column) => isNumericType(column.dataType))
  const order = result.columns.map((_column, index) => index)
  const keys = canonicalRows(result.rows, order, numericColumns, numericScale)
  const ordered = orderMatters ? keys : [...keys].sort()
  return createHash("sha256").update(ordered.join("\n")).digest("hex")
}
