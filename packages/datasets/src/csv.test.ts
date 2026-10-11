import { describe, expect, it } from "vitest"
import { csvChunks, formatCsvCell, formatCsvLine } from "./csv"

describe("csv", () => {
  it("writes nulls as empty unquoted fields and empty strings as quoted fields", () => {
    expect(formatCsvCell(null)).toBe("")
    expect(formatCsvCell("")).toBe('""')
  })

  it("quotes values containing separators, quotes or line breaks", () => {
    expect(formatCsvCell("a,b")).toBe('"a,b"')
    expect(formatCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(formatCsvCell("line\nbreak")).toBe('"line\nbreak"')
    expect(formatCsvCell("\\.")).toBe('"\\."')
  })

  it("formats booleans and numbers for PostgreSQL", () => {
    expect(formatCsvCell(true)).toBe("t")
    expect(formatCsvCell(false)).toBe("f")
    expect(formatCsvCell(42)).toBe("42")
    expect(() => formatCsvCell(Number.NaN)).toThrow()
  })

  it("joins cells into newline terminated lines and chunks them", () => {
    expect(formatCsvLine([1, "x", null, '{"a":1}'])).toBe('1,x,,"{""a"":1}"\n')
    const rows = Array.from({ length: 100 }, (_value, index) => [index, `row ${index}`])
    const chunks = [...csvChunks(rows, 64)]
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join("").split("\n").length).toBe(101)
  })
})
