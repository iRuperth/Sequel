import type { ColumnNode, SchemaKind, SchemaNode, SchemaTree, TableNode } from "@sequel/contracts"

export type FilteredTable = {
  table: TableNode
  columns: ColumnNode[]
  columnMatch: boolean
}

export type FilteredSchema = {
  schema: SchemaNode
  tables: FilteredTable[]
}

const KIND_ORDER: Record<SchemaKind, number> = {
  dataset: 0,
  scratch: 1,
  system: 2,
}

function includes(value: string, query: string): boolean {
  return value.toLowerCase().includes(query)
}

export function sortSchemas(schemas: readonly SchemaNode[]): SchemaNode[] {
  return [...schemas].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export function filterSchemaTree(tree: SchemaTree, rawQuery: string): FilteredSchema[] {
  const query = rawQuery.trim().toLowerCase()
  const result: FilteredSchema[] = []
  for (const schema of sortSchemas(tree.schemas)) {
    if (!query) {
      result.push({
        schema,
        tables: schema.tables.map((table) => ({
          table,
          columns: table.columns,
          columnMatch: false,
        })),
      })
      continue
    }
    const schemaMatch = includes(schema.name, query) || includes(schema.label, query)
    const tables: FilteredTable[] = []
    for (const table of schema.tables) {
      if (schemaMatch || includes(table.name, query)) {
        tables.push({ table, columns: table.columns, columnMatch: false })
        continue
      }
      const columns = table.columns.filter((column) => includes(column.name, query))
      if (columns.length > 0) {
        tables.push({ table, columns, columnMatch: true })
      }
    }
    if (tables.length > 0) {
      result.push({ schema, tables })
    }
  }
  return result
}

export function schemaKey(schema: string): string {
  return `schema:${schema}`
}

export function tableKey(schema: string, table: string): string {
  return `table:${schema}.${table}`
}
