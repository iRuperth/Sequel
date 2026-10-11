import { createHash } from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { csvChunks } from "../csv"
import { defaultDatasetsRoot } from "../paths"
import { loadPools, type Pools } from "../pools"
import { MS_PER_DAY, parseIsoDate } from "../time"
import { generateDatasetWithPools, listGeneratorSlugs } from "./index"
import type { GeneratedTable, GeneratorInput } from "./types"

const INPUT: GeneratorInput = { seed: 20260101, asOfDate: "2026-06-30", scale: 0.04 }
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+00$/

function tableHash(table: GeneratedTable): string {
  const hash = createHash("sha256")
  for (const chunk of csvChunks(table.rows())) {
    hash.update(chunk)
  }
  return hash.digest("hex")
}

function firstRows(table: GeneratedTable, count: number): unknown[] {
  const rows: unknown[] = []
  for (const row of table.rows()) {
    rows.push(row)
    if (rows.length >= count) {
      break
    }
  }
  return rows
}

describe("dataset generators", () => {
  let pools: Pools

  beforeAll(async () => {
    pools = await loadPools(defaultDatasetsRoot())
  })

  for (const slug of listGeneratorSlugs()) {
    describe(slug, () => {
      it("is deterministic for the same inputs", () => {
        const first = generateDatasetWithPools(slug, INPUT, pools)
        const second = generateDatasetWithPools(slug, INPUT, pools)
        expect(first.tables.map((table) => table.name)).toEqual(
          second.tables.map((table) => table.name),
        )
        first.tables.forEach((table, index) => {
          const other = second.tables[index] as GeneratedTable
          expect(firstRows(table, 3)).toEqual(firstRows(other, 3))
          expect(tableHash(table)).toBe(tableHash(other))
        })
      })

      it("can iterate the rows of a table more than once with identical output", () => {
        const dataset = generateDatasetWithPools(slug, INPUT, pools)
        for (const table of dataset.tables) {
          expect(tableHash(table)).toBe(tableHash(table))
        }
      })

      it("changes when the seed changes", () => {
        const base = generateDatasetWithPools(slug, INPUT, pools)
        const other = generateDatasetWithPools(slug, { ...INPUT, seed: INPUT.seed + 1 }, pools)
        const baseHashes = base.tables.map(tableHash)
        const otherHashes = other.tables.map(tableHash)
        expect(otherHashes).not.toEqual(baseHashes)
      })

      it("produces rows that match the column list and never stamps events after the as of date", () => {
        const dataset = generateDatasetWithPools(slug, INPUT, pools)
        const limit = parseIsoDate(INPUT.asOfDate) + MS_PER_DAY
        for (const table of dataset.tables) {
          let count = 0
          const timestampColumns = table.columns
            .map((name, index) => ({ name, index }))
            .filter((column) => column.name.endsWith("_at"))
          for (const row of table.rows()) {
            count += 1
            expect(row.length).toBe(table.columns.length)
            for (const column of timestampColumns) {
              const value = row[column.index]
              if (typeof value === "string") {
                expect(value).toMatch(TIMESTAMP_PATTERN)
                expect(Date.parse(value.replace(" ", "T").replace("+00", "Z"))).toBeLessThan(limit)
              }
            }
          }
          expect(count).toBe(table.rowCount)
        }
      })
    })
  }

  it("scales row counts with the scale factor", () => {
    const small = generateDatasetWithPools("fintech", INPUT, pools)
    const larger = generateDatasetWithPools("fintech", { ...INPUT, scale: INPUT.scale * 2 }, pools)
    const count = (tables: readonly GeneratedTable[], name: string) =>
      tables.find((table) => table.name === name)?.rowCount ?? 0
    expect(count(larger.tables, "transactions")).toBeGreaterThan(
      count(small.tables, "transactions") * 1.6,
    )
    expect(count(larger.tables, "account_holders")).toBe(count(small.tables, "account_holders") * 2)
  })

  it("rejects invalid inputs", () => {
    expect(() =>
      generateDatasetWithPools("fintech", { ...INPUT, asOfDate: "2026-02-30" }, pools),
    ).toThrow()
    expect(() => generateDatasetWithPools("fintech", { ...INPUT, scale: 0 }, pools)).toThrow()
    expect(() => generateDatasetWithPools("unknown", INPUT, pools)).toThrow()
  })
})
