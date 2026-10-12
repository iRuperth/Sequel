import type { QualityCheckConfig, QualityCheckKind } from "@sequel/contracts"
import { qualified, quoteIdent, quoteLiteral } from "../../shared/identifiers"

export type CheckTarget = {
  kind: QualityCheckKind
  targetSchema: string
  targetTable: string
  targetColumn: string | null
  config: QualityCheckConfig
}

export type CheckPlan = { sql: string; passes: (value: number) => boolean }

export function planCheck(check: CheckTarget, snapshotEnd: string): CheckPlan | null {
  const table = qualified(check.targetSchema, check.targetTable)
  const column = check.targetColumn ? quoteIdent(check.targetColumn) : null
  const zero = (value: number) => value === 0
  switch (check.kind) {
    case "not_null":
      return column
        ? { sql: `SELECT count(*) AS observed FROM ${table} WHERE ${column} IS NULL`, passes: zero }
        : null
    case "unique":
      return column
        ? {
            sql: `SELECT count(*) AS observed FROM (SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL GROUP BY ${column} HAVING count(*) > 1) AS duplicates`,
            passes: zero,
          }
        : null
    case "row_count_between":
      return {
        sql: `SELECT count(*) AS observed FROM ${table}`,
        passes: (value) =>
          (check.config.min === null || value >= check.config.min) &&
          (check.config.max === null || value <= check.config.max),
      }
    case "freshness":
      return column
        ? {
            sql: `SELECT round((EXTRACT(EPOCH FROM (${quoteLiteral(snapshotEnd)}::timestamptz - max(${column})::timestamptz)) / 3600)::numeric, 2) AS observed FROM ${table}`,
            passes: (value) =>
              check.config.maxAgeHours === null || value <= check.config.maxAgeHours,
          }
        : null
    case "accepted_values": {
      if (!column) {
        return null
      }
      const values = check.config.acceptedValues.map(quoteLiteral).join(", ") || "NULL"
      return {
        sql: `SELECT count(*) AS observed FROM ${table} WHERE ${column} IS NOT NULL AND ${column}::text NOT IN (${values})`,
        passes: zero,
      }
    }
    case "custom_sql": {
      const body = check.config.sql?.trim().replace(/;+\s*$/, "")
      return body
        ? { sql: `SELECT count(*) AS observed FROM (${body}) AS violations`, passes: zero }
        : null
    }
  }
}
