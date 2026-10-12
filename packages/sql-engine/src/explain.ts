import type { ExplainPlan, PlanNode } from "@sequel/contracts"

type RawPlan = Record<string, unknown>

const MAPPED_KEYS = new Set([
  "Node Type",
  "Relation Name",
  "Schema",
  "Alias",
  "Index Name",
  "Join Type",
  "Strategy",
  "Startup Cost",
  "Total Cost",
  "Plan Rows",
  "Plan Width",
  "Actual Startup Time",
  "Actual Total Time",
  "Actual Rows",
  "Actual Loops",
  "Filter",
  "Hash Cond",
  "Merge Cond",
  "Index Cond",
  "Recheck Cond",
  "Join Filter",
  "Sort Key",
  "Group Key",
  "Plans",
])

const CONDITION_KEYS = [
  "Hash Cond",
  "Merge Cond",
  "Index Cond",
  "Recheck Cond",
  "Join Filter",
] as const

const text = (value: unknown): string | null => (typeof value === "string" ? value : null)
const numeric = (value: unknown): number | null => (typeof value === "number" ? value : null)
const list = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.map((item) => String(item)) : null

function mapNode(raw: RawPlan): PlanNode {
  const details: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!MAPPED_KEYS.has(key) && value !== null && typeof value !== "object") {
      details[key] = String(value)
    }
  }
  const condition =
    CONDITION_KEYS.map((key) => text(raw[key])).find((value) => value !== null) ?? null
  const children = Array.isArray(raw["Plans"]) ? (raw["Plans"] as RawPlan[]).map(mapNode) : []
  return {
    nodeType: text(raw["Node Type"]) ?? "Unknown",
    relationName: text(raw["Relation Name"]),
    schema: text(raw["Schema"]),
    alias: text(raw["Alias"]),
    indexName: text(raw["Index Name"]),
    joinType: text(raw["Join Type"]),
    strategy: text(raw["Strategy"]),
    startupCost: numeric(raw["Startup Cost"]) ?? 0,
    totalCost: numeric(raw["Total Cost"]) ?? 0,
    planRows: numeric(raw["Plan Rows"]) ?? 0,
    planWidth: numeric(raw["Plan Width"]) ?? 0,
    actualStartupTime: numeric(raw["Actual Startup Time"]),
    actualTotalTime: numeric(raw["Actual Total Time"]),
    actualRows: numeric(raw["Actual Rows"]),
    actualLoops: numeric(raw["Actual Loops"]),
    filter: text(raw["Filter"]),
    condition,
    sortKey: list(raw["Sort Key"]),
    groupKey: list(raw["Group Key"]),
    details,
    children,
  }
}

export function parseExplainOutput(value: unknown, analyzed: boolean): ExplainPlan {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value
  const document = (Array.isArray(parsed) ? parsed[0] : parsed) as RawPlan | undefined
  const plan = document?.["Plan"] as RawPlan | undefined
  if (!plan) {
    throw new Error("EXPLAIN output did not contain a plan")
  }
  return {
    root: mapNode(plan),
    planningTimeMs: numeric(document?.["Planning Time"]),
    executionTimeMs: numeric(document?.["Execution Time"]),
    analyzed,
  }
}
