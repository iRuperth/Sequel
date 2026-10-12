import { describe, expect, it } from "vitest"
import { planCheck, type CheckTarget } from "./sql"

const base: CheckTarget = {
  kind: "not_null",
  targetSchema: "fintech",
  targetTable: "transactions",
  targetColumn: "merchant_id",
  config: { min: null, max: null, maxAgeHours: null, acceptedValues: [], sql: null },
}

describe("planCheck", () => {
  it("builds quoted SQL for column checks", () => {
    const plan = planCheck(base, "2026-06-30T23:59:59Z")
    expect(plan?.sql).toBe(
      'SELECT count(*) AS observed FROM "fintech"."transactions" WHERE "merchant_id" IS NULL',
    )
    expect(plan?.passes(0)).toBe(true)
    expect(plan?.passes(3)).toBe(false)
  })

  it("escapes accepted values", () => {
    const plan = planCheck(
      {
        ...base,
        kind: "accepted_values",
        targetColumn: "status",
        config: { ...base.config, acceptedValues: ["settled", "o'brien"] },
      },
      "2026-06-30T23:59:59Z",
    )
    expect(plan?.sql).toContain("NOT IN ('settled', 'o''brien')")
  })

  it("evaluates row count bounds", () => {
    const plan = planCheck(
      { ...base, kind: "row_count_between", config: { ...base.config, min: 10, max: 20 } },
      "x",
    )
    expect(plan?.passes(15)).toBe(true)
    expect(plan?.passes(25)).toBe(false)
  })

  it("counts the rows returned by custom checks", () => {
    const plan = planCheck(
      { ...base, kind: "custom_sql", config: { ...base.config, sql: "SELECT id FROM t WHERE x;" } },
      "x",
    )
    expect(plan?.sql).toBe(
      "SELECT count(*) AS observed FROM (SELECT id FROM t WHERE x) AS violations",
    )
  })

  it("requires a column or SQL where needed", () => {
    expect(planCheck({ ...base, targetColumn: null }, "x")).toBeNull()
    expect(planCheck({ ...base, kind: "custom_sql" }, "x")).toBeNull()
  })
})
