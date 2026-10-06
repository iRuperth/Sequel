import type { CellValue, ColumnMeta } from "@sequel/contracts"
import { CELL_TRUNCATION_SUFFIX } from "./constants"

export type ResultLimits = {
  maxRows: number
  maxBytes: number
  maxCellChars: number
}

export type CollectedRows = {
  rows: CellValue[][]
  truncated: boolean
  done: boolean
}

export function normaliseCell(
  value: unknown,
  maxCellChars: number,
): { cell: CellValue; bytes: number } {
  if (value === null || value === undefined) {
    return { cell: null, bytes: 4 }
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return { cell: value, bytes: 8 }
  }
  const text = typeof value === "string" ? value : JSON.stringify(value)
  const cell =
    text.length > maxCellChars ? `${text.slice(0, maxCellChars)}${CELL_TRUNCATION_SUFFIX}` : text
  return { cell, bytes: cell.length }
}

export class RowCollector {
  readonly rows: CellValue[][] = []
  private bytes = 0
  truncated = false

  constructor(private readonly limits: ResultLimits) {}

  add(batch: unknown[][]): boolean {
    for (const raw of batch) {
      if (this.rows.length >= this.limits.maxRows || this.bytes >= this.limits.maxBytes) {
        this.truncated = true
        return false
      }
      const row: CellValue[] = []
      for (const value of raw) {
        const { cell, bytes } = normaliseCell(value, this.limits.maxCellChars)
        this.bytes += bytes
        row.push(cell)
      }
      this.rows.push(row)
    }
    return true
  }
}

export function toColumnMeta(
  fields: readonly { name: string; dataTypeID: number }[],
  nameOf: (oid: number) => string,
): ColumnMeta[] {
  return fields.map((field) => ({
    name: field.name,
    dataType: nameOf(field.dataTypeID),
    dataTypeId: field.dataTypeID,
  }))
}
