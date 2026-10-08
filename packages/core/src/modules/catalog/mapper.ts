import type { CatalogLink, CatalogTableSummary, DatasetSummary } from "@sequel/contracts"
import type { catalogDatasets, catalogLinks, catalogTables } from "@sequel/db"
import { isoOrNull } from "../../shared/time"

export function toDatasetSummary(
  row: typeof catalogDatasets.$inferSelect,
  stats: { tableCount: number; totalRows: number; refreshedAt: Date | null },
): DatasetSummary {
  return {
    slug: row.slug,
    name: row.name,
    domain: row.domain,
    description: row.description,
    ownerTeam: row.ownerTeam,
    displayOrder: row.displayOrder,
    tags: row.tags,
    tableCount: stats.tableCount,
    totalRows: stats.totalRows,
    refreshedAt: isoOrNull(stats.refreshedAt),
  }
}

export function toTableSummary(
  row: typeof catalogTables.$inferSelect,
  columnCount: number,
): CatalogTableSummary {
  return {
    schema: row.schemaName,
    name: row.tableName,
    kind: row.kind,
    datasetSlug: row.datasetSlug,
    description: row.description,
    grain: row.grain,
    ownerTeam: row.ownerTeam,
    tags: row.tags,
    rowCount: row.rowCount,
    columnCount,
    refreshedAt: isoOrNull(row.refreshedAt),
  }
}

export function toLink(row: typeof catalogLinks.$inferSelect): CatalogLink {
  return {
    fromSchema: row.fromSchema,
    fromTable: row.fromTable,
    fromColumn: row.fromColumn,
    toSchema: row.toSchema,
    toTable: row.toTable,
    toColumn: row.toColumn,
    kind: row.kind,
  }
}
