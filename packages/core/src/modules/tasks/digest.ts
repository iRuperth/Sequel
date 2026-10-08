import { tables, type Database } from "@sequel/db"
import type { DigestDataset } from "@sequel/llm"
import { asc, inArray } from "drizzle-orm"

const DIGEST_EXAMPLES = 3

export class DatasetDigestBuilder {
  constructor(private readonly db: Database) {}

  async build(slugs: readonly string[]): Promise<DigestDataset[]> {
    if (slugs.length === 0) {
      return []
    }
    const [datasets, tableRows, columnRows, links] = await Promise.all([
      this.db
        .select()
        .from(tables.catalogDatasets)
        .where(inArray(tables.catalogDatasets.slug, [...slugs])),
      this.db
        .select()
        .from(tables.catalogTables)
        .where(inArray(tables.catalogTables.schemaName, [...slugs]))
        .orderBy(asc(tables.catalogTables.schemaName), asc(tables.catalogTables.tableName)),
      this.db
        .select()
        .from(tables.catalogColumns)
        .where(inArray(tables.catalogColumns.schemaName, [...slugs]))
        .orderBy(
          asc(tables.catalogColumns.schemaName),
          asc(tables.catalogColumns.tableName),
          asc(tables.catalogColumns.ordinal),
        ),
      this.db
        .select()
        .from(tables.catalogLinks)
        .where(inArray(tables.catalogLinks.fromSchema, [...slugs])),
    ])
    const references = new Map(
      links.map((link) => [
        `${link.fromSchema}.${link.fromTable}.${link.fromColumn}`,
        `${link.toSchema}.${link.toTable}.${link.toColumn}`,
      ]),
    )
    return slugs.flatMap((slug) => {
      const dataset = datasets.find((row) => row.slug === slug)
      if (!dataset) {
        return []
      }
      return [
        {
          slug,
          name: dataset.name,
          description: dataset.description,
          tables: tableRows
            .filter((table) => table.schemaName === slug)
            .map((table) => ({
              schema: table.schemaName,
              name: table.tableName,
              description: table.description,
              grain: table.grain,
              rowCount: table.rowCount,
              columns: columnRows
                .filter(
                  (column) => column.schemaName === slug && column.tableName === table.tableName,
                )
                .map((column) => ({
                  name: column.columnName,
                  dataType: column.dataType,
                  isPrimaryKey: column.isPrimaryKey,
                  references:
                    references.get(`${slug}.${table.tableName}.${column.columnName}`) ?? null,
                  description: column.description,
                  examples: column.exampleValues.slice(0, DIGEST_EXAMPLES),
                })),
            })),
        },
      ]
    })
  }
}
