import { UI_LIMITS } from "@/config/constants"

const SIMPLE_IDENTIFIER = /^[a-z_][a-z0-9_$]*$/

export function quoteIdent(name: string): string {
  return SIMPLE_IDENTIFIER.test(name) ? name : `"${name.replaceAll('"', '""')}"`
}

export function qualifiedName(schema: string, table: string, column?: string): string {
  const base = `${quoteIdent(schema)}.${quoteIdent(table)}`
  return column ? `${base}.${quoteIdent(column)}` : base
}

export function previewSql(
  schema: string,
  table: string,
  limit: number = UI_LIMITS.previewRowLimit,
): string {
  return `SELECT *\nFROM ${qualifiedName(schema, table)}\nLIMIT ${limit};`
}

export function selectColumnsSql(
  schema: string,
  table: string,
  columns: readonly string[],
): string {
  const list = columns.length > 0 ? columns.map(quoteIdent).join(",\n  ") : "*"
  return `SELECT\n  ${list}\nFROM ${qualifiedName(schema, table)}\nLIMIT ${UI_LIMITS.previewRowLimit};`
}

const SHORT_TYPE_NAMES: readonly (readonly [RegExp, string])[] = [
  [/^timestamp\((\d+)\) with time zone$/, "timestamptz($1)"],
  [/^timestamp with time zone$/, "timestamptz"],
  [/^timestamp\((\d+)\) without time zone$/, "timestamp($1)"],
  [/^timestamp without time zone$/, "timestamp"],
  [/^time with time zone$/, "timetz"],
  [/^time without time zone$/, "time"],
  [/^character varying/, "varchar"],
  [/^character\(/, "char("],
  [/^double precision$/, "float8"],
]

export function shortTypeName(dataType: string): string {
  for (const [pattern, replacement] of SHORT_TYPE_NAMES) {
    if (pattern.test(dataType)) {
      return dataType.replace(pattern, replacement)
    }
  }
  return dataType
}
