import { beforeAll, describe, expect, it } from "vitest"
import { classify, type ClassifyOptions } from "./classify"
import { LibpgQueryParser } from "./parser"

const parser = new LibpgQueryParser()
const read: ClassifyOptions = { mode: "read", maxStatements: 20, ownedSchemas: [] }
const scratch: ClassifyOptions = {
  mode: "scratch",
  maxStatements: 3,
  ownedSchemas: ["scratch_abc"],
}

beforeAll(async () => {
  await parser.ready()
})

describe("classify", () => {
  it.each([
    "SELECT 1",
    "WITH t AS (SELECT 1 AS x) SELECT x FROM t",
    "SELECT * FROM fintech.transactions WHERE amount > 10 ORDER BY 1 LIMIT 5",
    "EXPLAIN SELECT 1",
    "SHOW work_mem",
    "VALUES (1), (2)",
  ])("allows read statement %s", (sql) => {
    expect(classify(parser, sql, read).ok).toBe(true)
  })

  it.each([
    ["", "empty_query"],
    ["SELEC 1", "syntax_error"],
    ["SELECT 1; SELECT 2", "multiple_statements"],
    ["UPDATE fintech.accounts SET balance = 0", "statement_not_allowed"],
    ["SET statement_timeout = 0", "statement_not_allowed"],
    ["BEGIN", "statement_not_allowed"],
    ["COPY fintech.accounts TO STDOUT", "statement_not_allowed"],
    ["SELECT set_config('statement_timeout', '0', true)", "function_not_allowed"],
    ["SELECT pg_terminate_backend(1)", "function_not_allowed"],
    ["SELECT * FROM dblink('x', 'y') AS t(a int)", "function_not_allowed"],
    ["WITH d AS (DELETE FROM fintech.accounts RETURNING *) SELECT * FROM d", "data_modifying_cte"],
    ["SELECT 1 INTO new_table", "data_modifying_cte"],
    ["SELECT * FROM scratch_other.t", "schema_not_allowed"],
    ["EXPLAIN DELETE FROM fintech.accounts", "statement_not_allowed"],
  ])("rejects %s with %s", (sql, reason) => {
    const result = classify(parser, sql, read)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe(reason)
    }
  })

  it("allows scripts in scratch mode and marks row returning statements", () => {
    const result = classify(
      parser,
      "CREATE TABLE t (id int); INSERT INTO t VALUES (1) RETURNING id; SELECT * FROM scratch_abc.t",
      scratch,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.statements.map((statement) => statement.returnsRows)).toEqual([
        false,
        true,
        true,
      ])
      expect(result.statements[2]?.text).toBe("SELECT * FROM scratch_abc.t")
    }
  })

  it("limits scratch scripts and rejects untrusted languages", () => {
    const tooMany = classify(parser, "SELECT 1; SELECT 2; SELECT 3; SELECT 4", scratch)
    expect(tooMany.ok ? null : tooMany.reason).toBe("too_many_statements")
    const language = classify(
      parser,
      "CREATE FUNCTION f() RETURNS int LANGUAGE plpython3u AS 'return 1'",
      scratch,
    )
    expect(language.ok ? null : language.reason).toBe("statement_not_allowed")
    const plpgsql = classify(
      parser,
      "CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$ BEGIN RETURN 1; END $$",
      scratch,
    )
    expect(plpgsql.ok).toBe(true)
  })

  it("reports syntax error positions as one based offsets", () => {
    const result = classify(parser, "SELECT FROM WHERE x =", read)
    expect(result.ok ? null : result.position).toBe(13)
  })
})

describe("classify schema ownership", () => {
  it("rejects writes into another private schema", () => {
    const result = classify(parser, "INSERT INTO grade_x.t VALUES (1)", scratch)
    expect(result.ok ? null : result.reason).toBe("schema_not_allowed")
  })
})
