export type Cell = string | number | boolean | null
export type Row = readonly Cell[]

const NEEDS_QUOTES = /[",\n\r]/
const END_OF_DATA_MARKER = "\\."
const DEFAULT_CHUNK_BYTES = 256 * 1024

export function formatCsvCell(value: Cell): string {
  if (value === null) {
    return ""
  }
  if (typeof value === "boolean") {
    return value ? "t" : "f"
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialise non finite number ${value}`)
    }
    return String(value)
  }
  if (value.length === 0 || value === END_OF_DATA_MARKER || NEEDS_QUOTES.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function formatCsvLine(row: Row): string {
  let line = ""
  for (let index = 0; index < row.length; index += 1) {
    if (index > 0) {
      line += ","
    }
    line += formatCsvCell(row[index] ?? null)
  }
  return `${line}\n`
}

export function* csvChunks(
  rows: Iterable<Row>,
  chunkBytes = DEFAULT_CHUNK_BYTES,
): Generator<string> {
  let buffer = ""
  for (const row of rows) {
    buffer += formatCsvLine(row)
    if (buffer.length >= chunkBytes) {
      yield buffer
      buffer = ""
    }
  }
  if (buffer.length > 0) {
    yield buffer
  }
}
