import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  defaultDatasetsRoot,
  loadAllDatasets,
  loadCatalogDocs,
  loadManifest,
  loadQualityCheckSeeds,
  loadSavedQuerySeeds,
  loadStarterExercises,
  type DatasetLoadResult,
  type QualityCheckSeed,
  type StarterExercise,
} from "@sequel/datasets"
import pg from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const MAX_LOAD_MS = 60_000
const MAX_REFERENCE_ROWS = 500

const EXPECTED_QUALITY_OUTCOMES: Record<string, "pass" | "fail"> = {
  "fintech-transactions-merchant-mapped": "fail",
  "fintech-transactions-id-unique": "pass",
  "fintech-transactions-status-values": "pass",
  "fintech-fx-rates-row-count": "pass",
  "fintech-ledger-journals-balanced": "pass",
  "fintech-fraud-disputes-have-alert": "fail",
  "ecommerce-orders-status-values": "pass",
  "ecommerce-customers-email-case-duplicates": "fail",
  "web-events-session-exists": "fail",
  "hr-employees-id-unique": "pass",
  "finance-invoice-lines-volume": "pass",
}

function findWorkspaceRoot(start: string): string {
  let current = start
  while (!existsSync(join(current, "pnpm-workspace.yaml"))) {
    const parent = dirname(current)
    if (parent === current) {
      throw new Error("Could not locate the workspace root")
    }
    current = parent
  }
  return current
}

const workspaceRoot = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)))
const envFile = join(workspaceRoot, ".env")
if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }
  return value
}

const datasetsRoot = defaultDatasetsRoot()
const readerRole = requireEnv("POSTGRES_SANDBOX_READER_ROLE")
const writerRole = requireEnv("POSTGRES_SANDBOX_WRITER_ROLE")
const loadOptions = {
  seed: Number(requireEnv("DATASET_SEED")),
  asOfDate: requireEnv("DATASET_AS_OF_DATE"),
  scale: Number(requireEnv("DATASET_SCALE")),
  readerRole,
  writerRole,
}

const admin = new pg.Pool({ connectionString: requireEnv("SANDBOX_DATABASE_URL"), max: 3 })
const reader = new pg.Pool({ connectionString: requireEnv("SANDBOX_READER_DATABASE_URL"), max: 2 })
const writer = new pg.Pool({ connectionString: requireEnv("SANDBOX_WRITER_DATABASE_URL"), max: 2 })

const exercises = await loadStarterExercises(datasetsRoot)
const qualityChecks = await loadQualityCheckSeeds(datasetsRoot)
const savedQueries = await loadSavedQuerySeeds(datasetsRoot)
const manifest = await loadManifest(datasetsRoot)

interface QueryOutcome {
  columns: string[]
  rows: unknown[]
}

async function readOnly(sql: string): Promise<QueryOutcome> {
  const client = await reader.connect()
  try {
    await client.query("BEGIN READ ONLY")
    const result = await client.query(sql)
    return { columns: result.fields.map((field) => field.name), rows: result.rows }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined)
    client.release()
  }
}

async function runScratch(exercise: StarterExercise): Promise<QueryOutcome> {
  const schema = `scratch_it_${randomBytes(4).toString("hex")}`
  const adminClient = await admin.connect()
  const quotedSchema = adminClient.escapeIdentifier(schema)
  await adminClient.query(
    `CREATE SCHEMA ${quotedSchema} AUTHORIZATION ${adminClient.escapeIdentifier(writerRole)}`,
  )
  const client = await writer.connect()
  try {
    const searchPath = [schema, ...manifest.map((entry) => entry.slug)]
      .map((name) => client.escapeIdentifier(name))
      .join(", ")
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO ${searchPath}`)
    await client.query(exercise.referenceSql)
    const result = await client.query(exercise.verificationSql ?? "")
    return { columns: result.fields.map((field) => field.name), rows: result.rows }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined)
    client.release()
    await adminClient.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`)
    adminClient.release()
  }
}

function qualityConditionSql(check: QualityCheckSeed, client: pg.PoolClient): string {
  const table = `${client.escapeIdentifier(check.targetSchema)}.${client.escapeIdentifier(check.targetTable)}`
  const column = check.targetColumn === null ? null : client.escapeIdentifier(check.targetColumn)
  switch (check.kind) {
    case "not_null":
      return `SELECT COUNT(*)::int AS violations FROM ${table} WHERE ${column} IS NULL`
    case "unique":
      return `SELECT COUNT(*)::int AS violations FROM (SELECT ${column} FROM ${table} GROUP BY ${column} HAVING COUNT(*) > 1) AS duplicates`
    case "accepted_values": {
      const values = check.config.acceptedValues
        .map((value) => client.escapeLiteral(value))
        .join(", ")
      return `SELECT COUNT(*)::int AS violations FROM ${table} WHERE ${column} IS NOT NULL AND ${column}::text NOT IN (${values})`
    }
    case "row_count_between":
      return `SELECT COUNT(*)::int AS observed FROM ${table}`
    case "freshness":
      return `SELECT EXTRACT(EPOCH FROM now() - MAX(${column})) / 3600 AS age_hours FROM ${table}`
    case "custom_sql":
      return `SELECT COUNT(*)::int AS violations FROM (${(check.config.sql ?? "").trim().replace(/;$/, "")}) AS failing_rows`
  }
}

function qualityOutcome(check: QualityCheckSeed, row: Record<string, unknown>): "pass" | "fail" {
  if (check.kind === "row_count_between") {
    const observed = Number(row.observed)
    const tooLow = check.config.min !== null && observed < check.config.min
    const tooHigh = check.config.max !== null && observed > check.config.max
    return tooLow || tooHigh ? "fail" : "pass"
  }
  if (check.kind === "freshness") {
    return Number(row.age_hours) <= (check.config.maxAgeHours ?? Number.POSITIVE_INFINITY)
      ? "pass"
      : "fail"
  }
  return Number(row.violations) === 0 ? "pass" : "fail"
}

let loadResults: DatasetLoadResult[] = []
let loadDurationMs = 0

beforeAll(async () => {
  const started = performance.now()
  loadResults = await loadAllDatasets(admin, datasetsRoot, loadOptions)
  loadDurationMs = performance.now() - started
  const summary = loadResults
    .map((result) => `${result.slug}=${result.totalRows} rows in ${result.durationMs} ms`)
    .join(", ")
  process.stdout.write(`datasets loaded in ${Math.round(loadDurationMs)} ms: ${summary}\n`)
})

afterAll(async () => {
  await Promise.all([admin.end(), reader.end(), writer.end()])
})

describe("dataset load", () => {
  it("loads every dataset in manifest order within the time budget", () => {
    expect(loadResults.map((result) => result.slug)).toEqual(manifest.map((entry) => entry.slug))
    expect(loadDurationMs).toBeLessThan(MAX_LOAD_MS)
    for (const result of loadResults) {
      expect(result.tables.length).toBeGreaterThan(0)
      for (const table of result.tables) {
        expect(table.rows, `${result.slug}.${table.table}`).toBeGreaterThan(0)
      }
    }
  })

  it("creates tables whose columns match the catalog documentation", async () => {
    const docs = await loadCatalogDocs(datasetsRoot)
    for (const doc of docs) {
      const result = await admin.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = $1
         ORDER BY table_name, ordinal_position`,
        [doc.dataset],
      )
      for (const table of doc.tables) {
        const columns = result.rows
          .filter((row) => row.table_name === table.name)
          .map((row) => row.column_name)
        expect(columns, `${doc.dataset}.${table.name}`).toEqual(
          table.columns.map((column) => column.name),
        )
      }
    }
  })

  it("lets the reader role select from every dataset table and blocks writes", async () => {
    for (const result of loadResults) {
      for (const table of result.tables) {
        const outcome = await readOnly(`SELECT * FROM "${result.slug}"."${table.table}" LIMIT 1`)
        expect(outcome.rows.length, `${result.slug}.${table.table}`).toBe(1)
      }
    }
    await expect(
      readOnly(`DELETE FROM fintech.transactions WHERE transaction_id = 1`),
    ).rejects.toThrow()
  })
})

describe("starter exercises", () => {
  it.each(exercises.map((exercise) => [exercise.key, exercise] as const))(
    "%s reference solution is valid and deterministic",
    async (_key, exercise) => {
      const run =
        exercise.mode === "read"
          ? () => readOnly(exercise.referenceSql)
          : () => runScratch(exercise)
      const first = await run()
      const second = await run()
      expect(first.columns).toEqual(exercise.expectedColumns.map((column) => column.name))
      expect(first.rows.length).toBeGreaterThan(0)
      if (exercise.mode === "read") {
        expect(first.rows.length).toBeLessThanOrEqual(MAX_REFERENCE_ROWS)
      }
      expect(JSON.stringify(second.rows)).toBe(JSON.stringify(first.rows))
    },
  )
})

describe("platform seeds", () => {
  it.each(qualityChecks.map((check) => [check.key, check] as const))(
    "quality check %s evaluates to its expected outcome",
    async (key, check) => {
      const client = await reader.connect()
      try {
        await client.query("BEGIN READ ONLY")
        const result = await client.query<Record<string, unknown>>(
          qualityConditionSql(check, client),
        )
        const row = result.rows[0] ?? {}
        if (check.kind === "freshness") {
          expect(Number.isFinite(Number(row.age_hours))).toBe(true)
          return
        }
        const expected = EXPECTED_QUALITY_OUTCOMES[key]
        expect(expected, `${key} needs an expected outcome`).toBeDefined()
        expect(qualityOutcome(check, row)).toBe(expected)
      } finally {
        await client.query("ROLLBACK").catch(() => undefined)
        client.release()
      }
    },
  )

  it("finds unmapped merchants with the not null check on fintech.transactions", async () => {
    const outcome = await readOnly(
      "SELECT COUNT(*)::int AS violations FROM fintech.transactions WHERE merchant_id IS NULL",
    )
    expect(Number((outcome.rows[0] as { violations: number }).violations)).toBeGreaterThan(0)
  })

  it.each(savedQueries.map((query) => [query.key, query] as const))(
    "saved query %s runs with the reader role",
    async (_key, query) => {
      const outcome = await readOnly(query.sqlText)
      expect(outcome.rows.length).toBeGreaterThan(0)
    },
  )
})
