import type { SQLNamespace } from "@codemirror/lang-sql"
import type { SchemaTree } from "@sequel/contracts"
import { relationKindLabels, schemaKindLabels } from "@sequel/copy"

export function buildCompletionNamespace(tree: SchemaTree | null | undefined): SQLNamespace {
  const namespace: Record<string, SQLNamespace> = {}
  if (!tree) {
    return namespace
  }
  for (const schema of tree.schemas) {
    const tables: Record<string, SQLNamespace> = {}
    for (const table of schema.tables) {
      tables[table.name] = {
        self: { label: table.name, type: "type", detail: relationKindLabels[table.kind] },
        children: table.columns.map((column) => ({
          label: column.name,
          type: "property",
          detail: column.dataType,
          boost: column.isPrimaryKey ? 1 : 0,
        })),
      }
    }
    namespace[schema.name] = {
      self: { label: schema.name, type: "namespace", detail: schemaKindLabels[schema.kind] },
      children: tables,
    }
  }
  return namespace
}
