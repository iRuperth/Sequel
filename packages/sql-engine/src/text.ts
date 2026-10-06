const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type TextSpan = { start: number; end: number }

export function byteSpanToCharSpan(
  source: string,
  byteStart: number,
  byteLength: number | null,
): TextSpan {
  const bytes = encoder.encode(source)
  const end = byteLength === null ? bytes.length : byteStart + byteLength
  const start = decoder.decode(bytes.subarray(0, byteStart)).length
  const length = decoder.decode(bytes.subarray(byteStart, end)).length
  return { start, end: start + length }
}

export function lineAndColumn(source: string, position: number) {
  const before = source.slice(0, Math.max(0, position - 1))
  const lines = before.split("\n")
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}
