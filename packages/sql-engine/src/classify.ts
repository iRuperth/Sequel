import type { ExecutionMode, RejectionReason } from "@sequel/contracts"
import { collectFacts } from "./ast"
import { PRIVATE_SCHEMA_PREFIXES } from "./constants"
import type { ParsedStatement, SqlParser } from "./parser"
import {
  ALLOWED_FUNCTION_LANGUAGES,
  ROW_RETURNING_STATEMENTS,
  STATEMENT_ALLOWLIST,
  isDeniedFunction,
} from "./policy"

export type ClassifiedStatement = ParsedStatement & { returnsRows: boolean }

export type Classification =
  | { ok: true; statements: ClassifiedStatement[] }
  | { ok: false; reason: RejectionReason; detail: string | null; position: number | null }

export type ClassifyOptions = {
  mode: ExecutionMode
  maxStatements: number
  ownedSchemas: readonly string[]
}

function reject(
  reason: RejectionReason,
  detail: string | null = null,
  position: number | null = null,
): Classification {
  return { ok: false, reason, detail, position }
}

function hasReturning(statement: ParsedStatement): boolean {
  const node = statement.node as {
    returningList?: unknown[]
    returningClause?: { exprs?: unknown[] }
  }
  const expressions = node.returningClause?.exprs ?? node.returningList
  return Array.isArray(expressions) && expressions.length > 0
}

function explainTarget(
  statement: ParsedStatement,
): { kind: string; node: Record<string, unknown> } | null {
  const query = (statement.node as { query?: Record<string, unknown> }).query
  if (!query) {
    return null
  }
  const kind = Object.keys(query)[0]
  return kind ? { kind, node: query[kind] as Record<string, unknown> } : null
}

export function classify(parser: SqlParser, sql: string, options: ClassifyOptions): Classification {
  if (sql.trim().length === 0) {
    return reject("empty_query")
  }
  const parsed = parser.parse(sql)
  if (!parsed.ok) {
    return reject("syntax_error", parsed.message, parsed.position)
  }
  const { statements } = parsed
  if (statements.length === 0) {
    return reject("empty_query")
  }
  const isScratch = options.mode === "scratch"
  if (!isScratch && statements.length > 1) {
    return reject("multiple_statements", null, (statements[1]?.start ?? 0) + 1)
  }
  if (statements.length > options.maxStatements) {
    return reject("too_many_statements", String(options.maxStatements))
  }

  const allowlist = STATEMENT_ALLOWLIST[options.mode]
  const owned = new Set(options.ownedSchemas.map((schema) => schema.toLowerCase()))
  const classified: ClassifiedStatement[] = []

  for (const statement of statements) {
    const position = statement.start + 1
    if (!allowlist.has(statement.kind)) {
      return reject("statement_not_allowed", statement.kind, position)
    }
    const target = statement.kind === "ExplainStmt" ? explainTarget(statement) : null
    if (target && !allowlist.has(target.kind)) {
      return reject("statement_not_allowed", target.kind, position)
    }
    const facts = collectFacts(statement.node, statement.kind)
    const deniedFunction = facts.functionNames.find(isDeniedFunction)
    if (deniedFunction) {
      return reject("function_not_allowed", deniedFunction, position)
    }
    const foreignSchema = facts.schemaReferences.find(
      (schema) =>
        PRIVATE_SCHEMA_PREFIXES.some((prefix) => schema.startsWith(prefix)) && !owned.has(schema),
    )
    if (foreignSchema) {
      return reject("schema_not_allowed", foreignSchema, position)
    }
    if (!isScratch && (facts.nestedStatementKinds.length > 0 || facts.hasSelectInto)) {
      return reject("data_modifying_cte", facts.nestedStatementKinds[0] ?? "SelectInto", position)
    }
    const unsupportedLanguage = facts.functionLanguages.find(
      (language) => !ALLOWED_FUNCTION_LANGUAGES.has(language),
    )
    if (statement.kind === "CreateFunctionStmt" && unsupportedLanguage) {
      return reject("statement_not_allowed", unsupportedLanguage, position)
    }
    const returnsRows =
      (ROW_RETURNING_STATEMENTS.has(statement.kind) && !facts.hasSelectInto) ||
      hasReturning(statement)
    classified.push({ ...statement, returnsRows })
  }
  return { ok: true, statements: classified }
}
