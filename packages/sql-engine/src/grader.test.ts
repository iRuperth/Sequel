import type { ColumnMeta } from "@sequel/contracts"
import { describe, expect, it } from "vitest"
import { gradeResults, resultDigest } from "./grader"

const column = (name: string, dataType = "text"): ColumnMeta => ({ name, dataType, dataTypeId: 25 })
const options = { orderMatters: false, numericScale: 4, sampleSize: 5 }

describe("gradeResults", () => {
  const expected = {
    columns: [column("merchant"), column("total", "numeric")],
    rows: [
      ["Acme", "10.50"],
      ["Globex", "3"],
    ],
    truncated: false,
  }

  it("passes on equal multisets regardless of order and numeric formatting", () => {
    const actual = {
      columns: [column("merchant"), column("total", "numeric")],
      rows: [
        ["Globex", 3],
        ["Acme", "10.5000"],
      ],
      truncated: false,
    }
    expect(gradeResults(expected, actual, options).passed).toBe(true)
  })

  it("fails when order matters and rows are permuted", () => {
    const actual = { ...expected, rows: [...expected.rows].reverse() }
    const report = gradeResults(expected, actual, { ...options, orderMatters: true })
    expect(report.passed).toBe(false)
    expect(report.notes).toContain("row_order_differs")
  })

  it("matches columns by name when they are reordered", () => {
    const actual = {
      columns: [column("total", "numeric"), column("merchant")],
      rows: [
        ["3", "Globex"],
        ["10.5", "Acme"],
      ],
      truncated: false,
    }
    const report = gradeResults(expected, actual, options)
    expect(report.passed).toBe(true)
    expect(report.matchedByName).toBe(true)
  })

  it("reports missing and extra rows", () => {
    const actual = {
      ...expected,
      rows: [
        ["Acme", "10.50"],
        ["Initech", "1"],
      ],
    }
    const report = gradeResults(expected, actual, options)
    expect(report.passed).toBe(false)
    expect(report.missingRowCount).toBe(1)
    expect(report.extraRowCount).toBe(1)
    expect(report.sampleMissing[0]).toEqual(["Globex", "3"])
  })

  it("fails on column count mismatch", () => {
    const actual = { columns: [column("merchant")], rows: [["Acme"]], truncated: false }
    const report = gradeResults(expected, actual, options)
    expect(report.passed).toBe(false)
    expect(report.notes).toContain("column_count_mismatch")
  })

  it("produces stable digests", () => {
    const shuffled = { ...expected, rows: [...expected.rows].reverse() }
    expect(resultDigest(expected, false, 4)).toBe(resultDigest(shuffled, false, 4))
    expect(resultDigest(expected, true, 4)).not.toBe(resultDigest(shuffled, true, 4))
  })
})
