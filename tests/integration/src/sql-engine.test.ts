import { loadCoreConfig } from "@sequel/config"
import { SqlEngine } from "@sequel/sql-engine"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const config = loadCoreConfig()
const TEST_SCHEMA = "itest_engine"
const SCRATCH_SCHEMA = "scratch_itest"
const readerRole = decodeURIComponent(new URL(config.sandbox.readerUrl).username)
const writerRole = decodeURIComponent(new URL(config.sandbox.writerUrl).username)

const engine = new SqlEngine({
  adminUrl: config.sandbox.adminUrl,
  readerUrl: config.sandbox.readerUrl,
  writerUrl: config.sandbox.writerUrl,
  poolSize: 4,
  applicationName: "sequel-itest",
  maxRows: config.sandbox.maxRows,
  maxBytes: config.sandbox.maxResultBytes,
  maxCellChars: config.sandbox.maxCellChars,
  fetchChunk: 5,
  statementTimeoutMs: config.sandbox.statementTimeoutMs,
  cancelGraceMs: 500,
  maxStatementsPerRun: config.sandbox.maxStatementsPerRun,
})

const read = (sql: string, extra: Partial<Parameters<typeof engine.runner.execute>[0]> = {}) =>
  engine.runner.execute({
    sql,
    mode: "read",
    searchPath: [TEST_SCHEMA],
    ownedSchemas: [],
    ...extra,
  })

beforeAll(async () => {
  await engine.ready()
  const admin = engine.pools.admin
  await admin.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`)
  await admin.query(`CREATE SCHEMA ${TEST_SCHEMA}`)
  await admin.query(
    `CREATE TABLE ${TEST_SCHEMA}.accounts (id int PRIMARY KEY, owner text, balance numeric(12,2))`,
  )
  await admin.query(
    `INSERT INTO ${TEST_SCHEMA}.accounts VALUES (1, 'Ada', 120.50), (2, 'Grace', -3.25), (3, NULL, 0)`,
  )
  await admin.query(`CREATE TABLE ${TEST_SCHEMA}.restricted (id int)`)
  await admin.query(`GRANT USAGE ON SCHEMA ${TEST_SCHEMA} TO ${readerRole}, ${writerRole}`)
  await admin.query(`GRANT SELECT ON ${TEST_SCHEMA}.accounts TO ${readerRole}, ${writerRole}`)
  await engine.scratch.drop(SCRATCH_SCHEMA)
  await engine.scratch.create(SCRATCH_SCHEMA)
})

afterAll(async () => {
  await engine.pools.admin.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`)
  await engine.scratch.drop(SCRATCH_SCHEMA)
  await engine.close()
})

describe("sql engine against the sandbox", () => {
  it("returns typed rows for read queries", async () => {
    const outcome = await read("SELECT id, owner, balance FROM accounts ORDER BY id")
    expect(outcome.status).toBe("succeeded")
    expect(outcome.result?.columns.map((column) => column.dataType)).toEqual([
      "integer",
      "text",
      "numeric",
    ])
    expect(outcome.result?.rows).toEqual([
      [1, "Ada", "120.50"],
      [2, "Grace", "-3.25"],
      [3, null, "0.00"],
    ])
  })

  it("caps rows and flags truncation", async () => {
    const outcome = await read("SELECT g FROM generate_series(1, 50) AS g", { maxRows: 12 })
    expect(outcome.result?.rowCount).toBe(12)
    expect(outcome.result?.truncated).toBe(true)
  })

  it("enforces the statement timeout", async () => {
    const outcome = await read("SELECT pg_sleep(3)", { statementTimeoutMs: 200 })
    expect(outcome.status).toBe("timed_out")
  })

  it("cancels running queries by request id", async () => {
    const requestId = crypto.randomUUID()
    const running = read("SELECT pg_sleep(5)", { requestId })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(await engine.runner.cancel(requestId)).toBe(true)
    const outcome = await running
    expect(outcome.status).toBe("cancelled")
  })

  it("rejects writes and restricted functions in read mode", async () => {
    expect((await read("UPDATE accounts SET balance = 0")).status).toBe("rejected")
    expect(
      (await read("SELECT set_config('statement_timeout', '0', false)")).error?.rejectionReason,
    ).toBe("function_not_allowed")
  })

  it("relies on grants for objects the reader cannot see", async () => {
    const outcome = await read("SELECT * FROM restricted")
    expect(outcome.status).toBe("failed")
    expect(outcome.error?.sqlState).toBe("42501")
  })

  it("reports absolute error positions", async () => {
    const outcome = await read("SELECT id,\n  missing_column FROM accounts")
    expect(outcome.status).toBe("failed")
    expect(outcome.error?.position).toBe(14)
  })

  it("runs scratch scripts and exposes created tables to read mode", async () => {
    const script = [
      "CREATE TABLE negative_accounts AS SELECT id, balance FROM itest_engine.accounts WHERE balance < 0",
      "INSERT INTO negative_accounts VALUES (99, -1)",
      "SELECT id, balance FROM negative_accounts ORDER BY id",
    ].join(";\n")
    const outcome = await engine.runner.execute({
      sql: script,
      mode: "scratch",
      searchPath: [SCRATCH_SCHEMA, TEST_SCHEMA],
      ownedSchemas: [SCRATCH_SCHEMA],
    })
    expect(outcome.status).toBe("succeeded")
    expect(outcome.statementCount).toBe(3)
    expect(outcome.result?.rows).toEqual([
      [2, "-3.25"],
      [99, "-1.00"],
    ])
    const readBack = await read("SELECT count(*) AS total FROM negative_accounts", {
      searchPath: [SCRATCH_SCHEMA, TEST_SCHEMA],
      ownedSchemas: [SCRATCH_SCHEMA],
    })
    expect(readBack.result?.rows).toEqual([["2"]])
  })

  it("prevents scratch scripts from writing into shared schemas", async () => {
    const outcome = await engine.runner.execute({
      sql: "INSERT INTO itest_engine.accounts VALUES (10, 'Mallory', 1)",
      mode: "scratch",
      searchPath: [SCRATCH_SCHEMA, TEST_SCHEMA],
      ownedSchemas: [SCRATCH_SCHEMA],
    })
    expect(outcome.status).toBe("failed")
    expect(outcome.error?.sqlState).toBe("42501")
  })

  it("rolls back grading runs and returns the follow up result", async () => {
    const outcome = await engine.runner.execute({
      sql: "CREATE TABLE graded AS SELECT 1 AS value",
      mode: "scratch",
      searchPath: [SCRATCH_SCHEMA],
      ownedSchemas: [SCRATCH_SCHEMA],
      commit: false,
      followUpSql: "SELECT value FROM graded",
    })
    expect(outcome.result?.rows).toEqual([[1]])
    expect(await engine.scratch.objects(SCRATCH_SCHEMA)).not.toContainEqual(
      expect.objectContaining({ name: "graded" }),
    )
  })

  it("explains queries with a typed plan", async () => {
    const outcome = await engine.runner.explain({
      sql: "SELECT owner FROM accounts WHERE balance > 0",
      analyze: true,
      role: "reader",
      searchPath: [TEST_SCHEMA],
      ownedSchemas: [],
    })
    expect(outcome.status).toBe("succeeded")
    expect(outcome.plan?.root.nodeType).toBe("Seq Scan")
    expect(outcome.plan?.analyzed).toBe(true)
  })
})
