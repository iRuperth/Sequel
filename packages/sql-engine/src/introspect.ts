import type { ColumnNode, RelationKind, TableNode } from "@sequel/contracts"
import type pg from "pg"

const RELATION_KIND_CODES: Record<string, RelationKind> = {
  r: "table",
  p: "table",
  v: "view",
  m: "materialized_view",
  f: "foreign_table",
}

export function relationKindFromCode(code: string): RelationKind {
  return RELATION_KIND_CODES[code] ?? "table"
}

type ColumnRow = {
  schema: string
  table_name: string
  kind: string
  estimate: string | null
  column_name: string
  data_type: string
  nullable: boolean
  attnum: number
}

type ConstraintRow = {
  schema: string
  table_name: string
  kind: string
  columns: string
  ref_schema: string | null
  ref_table: string | null
  ref_columns: string | null
}

const parseNames = (value: string | null): string[] =>
  value ? (JSON.parse(value) as string[]) : []

export type IntrospectedSchema = { name: string; tables: TableNode[] }

export async function introspectSchemas(
  pool: pg.Pool,
  schemas: readonly string[],
): Promise<IntrospectedSchema[]> {
  if (schemas.length === 0) {
    return []
  }
  const [columns, constraints] = await Promise.all([
    pool.query<ColumnRow>(
      `SELECT n.nspname AS schema, c.relname AS table_name, c.relkind AS kind,
              c.reltuples::bigint AS estimate, a.attname AS column_name,
              format_type(a.atttypid, a.atttypmod) AS data_type, NOT a.attnotnull AS nullable, a.attnum
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        WHERE n.nspname = ANY($1::text[]) AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
        ORDER BY n.nspname, c.relname, a.attnum`,
      [schemas],
    ),
    pool.query<ConstraintRow>(
      `SELECT n.nspname AS schema, c.relname AS table_name, con.contype AS kind,
              to_json(ARRAY(SELECT a.attname FROM unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
                      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
                     ORDER BY k.ord))::text AS columns,
              rn.nspname AS ref_schema, rc.relname AS ref_table,
              CASE WHEN con.confrelid = 0 THEN NULL ELSE
              to_json(ARRAY(SELECT a.attname FROM unnest(con.confkey) WITH ORDINALITY k(attnum, ord)
                      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum
                     ORDER BY k.ord))::text END AS ref_columns
         FROM pg_constraint con
         JOIN pg_class c ON c.oid = con.conrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         LEFT JOIN pg_class rc ON rc.oid = con.confrelid
         LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
        WHERE n.nspname = ANY($1::text[]) AND con.contype IN ('p', 'f')`,
      [schemas],
    ),
  ])

  const primaryKeys = new Set<string>()
  const references = new Map<string, ColumnNode["references"]>()
  for (const row of constraints.rows) {
    const referenced = parseNames(row.ref_columns)
    parseNames(row.columns).forEach((column, index) => {
      const key = `${row.schema}.${row.table_name}.${column}`
      const target = referenced[index]
      if (row.kind === "p") {
        primaryKeys.add(key)
      } else if (row.ref_schema && row.ref_table && target) {
        references.set(key, { schema: row.ref_schema, table: row.ref_table, column: target })
      }
    })
  }

  const bySchema = new Map<string, Map<string, TableNode>>()
  for (const schema of schemas) {
    bySchema.set(schema, new Map())
  }
  for (const row of columns.rows) {
    const tables = bySchema.get(row.schema)
    if (!tables) {
      continue
    }
    let table = tables.get(row.table_name)
    if (!table) {
      const estimate = row.estimate === null ? null : Number(row.estimate)
      table = {
        name: row.table_name,
        kind: relationKindFromCode(row.kind),
        rowEstimate: estimate === null || estimate < 0 ? null : estimate,
        columns: [],
      }
      tables.set(row.table_name, table)
    }
    const key = `${row.schema}.${row.table_name}.${row.column_name}`
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.nullable,
      isPrimaryKey: primaryKeys.has(key),
      references: references.get(key) ?? null,
    })
  }
  return schemas.map((name) => ({ name, tables: [...(bySchema.get(name)?.values() ?? [])] }))
}
