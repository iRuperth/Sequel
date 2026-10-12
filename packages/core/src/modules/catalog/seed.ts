import { tables, type Database } from "@sequel/db"
import { and, eq, inArray } from "drizzle-orm"

export type CatalogDatasetSeed = {
  slug: string
  name: string
  domain: string
  description: string
  ownerTeam: string
  displayOrder: number
  tags: string[]
}

export type CatalogColumnSeed = {
  name: string
  description: string
  isPii: boolean
  exampleValues: string[]
}

export type CatalogTableSeed = {
  schema: string
  table: string
  description: string
  grain: string | null
  ownerTeam: string
  tags: string[]
  columns: CatalogColumnSeed[]
}

export type CatalogLinkSeed = {
  fromSchema: string
  fromTable: string
  fromColumn: string
  toSchema: string
  toTable: string
  toColumn: string
}

export type CatalogSeed = {
  datasets: CatalogDatasetSeed[]
  tables: CatalogTableSeed[]
  links: CatalogLinkSeed[]
}

export class CatalogSeeder {
  constructor(private readonly db: Database) {}

  async apply(seed: CatalogSeed): Promise<void> {
    const slugs = seed.datasets.map((dataset) => dataset.slug)
    await this.db.transaction(async (tx) => {
      for (const dataset of seed.datasets) {
        await tx
          .insert(tables.catalogDatasets)
          .values(dataset)
          .onConflictDoUpdate({ target: tables.catalogDatasets.slug, set: dataset })
      }
      if (slugs.length > 0) {
        await tx
          .delete(tables.catalogLinks)
          .where(
            and(
              inArray(tables.catalogLinks.fromSchema, slugs),
              eq(tables.catalogLinks.kind, "logical"),
            ),
          )
      }
      for (const table of seed.tables) {
        const values = {
          description: table.description,
          grain: table.grain,
          ownerTeam: table.ownerTeam,
          tags: table.tags,
        }
        await tx
          .insert(tables.catalogTables)
          .values({
            schemaName: table.schema,
            tableName: table.table,
            datasetSlug: table.schema,
            ...values,
          })
          .onConflictDoUpdate({
            target: [tables.catalogTables.schemaName, tables.catalogTables.tableName],
            set: values,
          })
        for (const [index, column] of table.columns.entries()) {
          const docs = {
            description: column.description,
            isPii: column.isPii,
            exampleValues: column.exampleValues,
          }
          await tx
            .insert(tables.catalogColumns)
            .values({
              schemaName: table.schema,
              tableName: table.table,
              columnName: column.name,
              ordinal: index + 1,
              dataType: "",
              isNullable: true,
              ...docs,
            })
            .onConflictDoUpdate({
              target: [
                tables.catalogColumns.schemaName,
                tables.catalogColumns.tableName,
                tables.catalogColumns.columnName,
              ],
              set: docs,
            })
        }
      }
      if (seed.links.length > 0) {
        await tx
          .insert(tables.catalogLinks)
          .values(seed.links.map((link) => ({ ...link, kind: "logical" as const })))
          .onConflictDoNothing()
      }
    })
  }
}
