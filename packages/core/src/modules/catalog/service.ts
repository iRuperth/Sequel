import type {
  CatalogSearchResult,
  CatalogTableDetail,
  DatasetDetail,
  DatasetSummary,
} from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { and, asc, count, eq, ilike, max, or, sum } from "drizzle-orm"
import { notFound } from "../../shared/errors"
import { toDatasetSummary, toLink, toTableSummary } from "./mapper"

const SEARCH_LIMIT = 25

export class CatalogService {
  constructor(private readonly db: Database) {}

  async datasets(): Promise<DatasetSummary[]> {
    const [datasets, stats] = await Promise.all([
      this.db
        .select()
        .from(tables.catalogDatasets)
        .orderBy(asc(tables.catalogDatasets.displayOrder)),
      this.db
        .select({
          slug: tables.catalogTables.datasetSlug,
          tableCount: count(),
          totalRows: sum(tables.catalogTables.rowCount),
          refreshedAt: max(tables.catalogTables.refreshedAt),
        })
        .from(tables.catalogTables)
        .groupBy(tables.catalogTables.datasetSlug),
    ])
    const bySlug = new Map(stats.map((row) => [row.slug, row]))
    return datasets.map((row) => {
      const stat = bySlug.get(row.slug)
      return toDatasetSummary(row, {
        tableCount: stat?.tableCount ?? 0,
        totalRows: Number(stat?.totalRows ?? 0),
        refreshedAt: stat?.refreshedAt ?? null,
      })
    })
  }

  async dataset(slug: string): Promise<DatasetDetail> {
    const summary = (await this.datasets()).find((dataset) => dataset.slug === slug)
    if (!summary) {
      throw notFound()
    }
    const [tableRows, columnCounts, links] = await Promise.all([
      this.db
        .select()
        .from(tables.catalogTables)
        .where(eq(tables.catalogTables.datasetSlug, slug))
        .orderBy(asc(tables.catalogTables.tableName)),
      this.columnCounts(slug),
      this.db
        .select()
        .from(tables.catalogLinks)
        .where(
          or(eq(tables.catalogLinks.fromSchema, slug), eq(tables.catalogLinks.toSchema, slug)),
        ),
    ])
    return {
      ...summary,
      tables: tableRows.map((row) => toTableSummary(row, columnCounts.get(row.tableName) ?? 0)),
      links: links.map(toLink),
    }
  }

  async table(schema: string, table: string): Promise<CatalogTableDetail> {
    const row = await this.db.query.catalogTables.findFirst({
      where: and(
        eq(tables.catalogTables.schemaName, schema),
        eq(tables.catalogTables.tableName, table),
      ),
    })
    if (!row) {
      throw notFound()
    }
    const [columns, outgoing, incoming] = await Promise.all([
      this.db
        .select()
        .from(tables.catalogColumns)
        .where(
          and(
            eq(tables.catalogColumns.schemaName, schema),
            eq(tables.catalogColumns.tableName, table),
          ),
        )
        .orderBy(asc(tables.catalogColumns.ordinal)),
      this.db
        .select()
        .from(tables.catalogLinks)
        .where(
          and(eq(tables.catalogLinks.fromSchema, schema), eq(tables.catalogLinks.fromTable, table)),
        ),
      this.db
        .select()
        .from(tables.catalogLinks)
        .where(
          and(eq(tables.catalogLinks.toSchema, schema), eq(tables.catalogLinks.toTable, table)),
        ),
    ])
    return {
      ...toTableSummary(row, columns.length),
      columns: columns.map((column) => ({
        name: column.columnName,
        ordinal: column.ordinal,
        dataType: column.dataType,
        isNullable: column.isNullable,
        isPrimaryKey: column.isPrimaryKey,
        description: column.description,
        isPii: column.isPii,
        exampleValues: column.exampleValues,
        nullFraction: column.nullFraction,
        distinctCount: column.distinctCount,
      })),
      sample: { columns: row.sampleColumns ?? [], rows: row.sampleRows ?? [] },
      outgoing: outgoing.map(toLink),
      incoming: incoming.map(toLink),
    }
  }

  async search(query: string | undefined): Promise<CatalogSearchResult> {
    const term = query?.trim()
    if (!term) {
      return { tables: [], columns: [] }
    }
    const pattern = `%${term}%`
    const [tableRows, columnRows] = await Promise.all([
      this.db
        .select()
        .from(tables.catalogTables)
        .where(
          or(
            ilike(tables.catalogTables.tableName, pattern),
            ilike(tables.catalogTables.description, pattern),
          ),
        )
        .orderBy(asc(tables.catalogTables.schemaName), asc(tables.catalogTables.tableName))
        .limit(SEARCH_LIMIT),
      this.db
        .select()
        .from(tables.catalogColumns)
        .where(
          or(
            ilike(tables.catalogColumns.columnName, pattern),
            ilike(tables.catalogColumns.description, pattern),
          ),
        )
        .orderBy(asc(tables.catalogColumns.schemaName), asc(tables.catalogColumns.tableName))
        .limit(SEARCH_LIMIT),
    ])
    const counts = await this.db
      .select({
        schema: tables.catalogColumns.schemaName,
        table: tables.catalogColumns.tableName,
        total: count(),
      })
      .from(tables.catalogColumns)
      .groupBy(tables.catalogColumns.schemaName, tables.catalogColumns.tableName)
    const countMap = new Map(counts.map((row) => [`${row.schema}.${row.table}`, row.total]))
    return {
      tables: tableRows.map((row) =>
        toTableSummary(row, countMap.get(`${row.schemaName}.${row.tableName}`) ?? 0),
      ),
      columns: columnRows.map((row) => ({
        schema: row.schemaName,
        table: row.tableName,
        column: row.columnName,
        dataType: row.dataType,
        description: row.description,
      })),
    }
  }

  async isSeeded(): Promise<boolean> {
    const [row] = await this.db.select({ total: count() }).from(tables.catalogDatasets)
    return (row?.total ?? 0) > 0
  }

  private async columnCounts(slug: string): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ table: tables.catalogColumns.tableName, total: count() })
      .from(tables.catalogColumns)
      .where(eq(tables.catalogColumns.schemaName, slug))
      .groupBy(tables.catalogColumns.tableName)
    return new Map(rows.map((row) => [row.table, row.total]))
  }
}
