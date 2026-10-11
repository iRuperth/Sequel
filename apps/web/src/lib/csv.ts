import type { CellValue } from "@sequel/contracts"
import { CSV_FORMAT } from "@sequel/copy"

const NEEDS_QUOTING = /[",\r\n]/

function escapeCell(value: CellValue): string {
  if (value === null) {
    return ""
  }
  const text = String(value)
  if (NEEDS_QUOTING.test(text) || text.startsWith(" ") || text.endsWith(" ")) {
    return `${CSV_FORMAT.quote}${text.replaceAll(CSV_FORMAT.quote, CSV_FORMAT.quote + CSV_FORMAT.quote)}${CSV_FORMAT.quote}`
  }
  return text
}

export function toCsv(columns: readonly string[], rows: readonly (readonly CellValue[])[]): string {
  const lines = [columns.map(escapeCell).join(CSV_FORMAT.delimiter)]
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(CSV_FORMAT.delimiter))
  }
  return lines.join(CSV_FORMAT.lineBreak)
}

export function downloadCsv(
  fileBaseName: string,
  columns: readonly string[],
  rows: readonly (readonly CellValue[])[],
): void {
  const blob = new Blob([toCsv(columns, rows)], { type: CSV_FORMAT.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  anchor.href = url
  anchor.download = `${fileBaseName}-${stamp}${CSV_FORMAT.extension}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
