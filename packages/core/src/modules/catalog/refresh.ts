import type { CellValue, ColumnMeta } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import type { SqlEngine } from "@sequel/sql-engine"
import { and, eq } from "drizzle-orm"
import type { Logger } from "../../shared/logger"
import { qualified } from "../../shared/identifiers"
import type { WarehouseService } from "../warehouse/service"

const SAMPLE_ROWS = 10
const SAMPLE_CELL_CHARS = 200

type StatRow = {
  table_name: string
  column_name: string
  null_frac: number | null
  n_distinct: number | null
}

export class CatalogRefresher {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly logger: Logger,
  ) {}

  async refresh(onProgress?: (progress: number, stage: string) => Promise<void>): Promise<number> {
    const datasets = await this.warehouse.datasets()
    const [run] = await this.db.insert(tables.catalogRefreshes).values({}).returning()
    let refreshed = 0
    for (const [index, dataset] of datasets.entries()) {
      await onProgress?.(Math.round((index / Math.max(1, datasets.length)) * 100), dataset.slug)
      refreshed += await this.refreshSchema(dataset.slug)
    }
    if (run) {
      await this.db
        .update(tables.catalogRefreshes)
        .set({ finishedAt: new Date(), tableCount: refreshed })
        .where(eq(tables.catalogRefreshes.id, run.id))
    }
    await this.warehouse.invalidateAll()
    this.logger.info({ tables: refreshed }, "catalog refreshed")
    return refreshed
  }

  private async refreshSchema(schema: string): Promise<number> {
    const [introspected] = await this.engine.introspect([schema])
    if (!introspected) {
      return 0
    }
    const dataset = await this.db.query.catalogDatasets.findFirst({
      where: eq(tables.catalogDatasets.slug, schema),
    })
    const stats = await this.engine.pools.admin.query<StatRow>(
      `SELECT tablename AS table_name, attname AS column_name, null_frac, n_distinct
         FROM pg_stats WHERE schemaname = $1`,
      [schema],
    )
    const statMap = new Map(stats.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]))

    for (const table of introspected.tables) {
      const countResult = await this.engine.pools.admin.query<{ total: string }>(
        `SELECT count(*) AS total FROM ${qualified(schema, table.name)}`,
      )
      const rowCount = Number(countResult.rows[0]?.total ?? 0)
      const sample = await this.sample(schema, table.name)
      await this.db
        .insert(tables.catalogTables)
        .values({
          schemaName: schema,
          tableName: table.name,
          datasetSlug: schema,
          kind: table.kind,
          description: "",
          ownerTeam: dataset?.ownerTeam ?? "",
          rowCount,
          sampleColumns: sample.columns,
          sampleRows: sample.rows,
          refreshedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [tables.catalogTables.schemaName, tables.catalogTables.tableName],
          set: {
            kind: table.kind,
            rowCount,
            sampleColumns: sample.columns,
            sampleRows: sample.rows,
            refreshedAt: new Date(),
          },
        })

      for (const [ordinal, column] of table.columns.entries()) {
        const stat = statMap.get(`${table.name}.${column.name}`)
        const distinct =
          stat?.n_distinct === null || stat?.n_distinct === undefined
            ? null
            : stat.n_distinct < 0
              ? Math.round(-stat.n_distinct * rowCount)
              : stat.n_distinct
        const technical = {
          ordinal: ordinal + 1,
          dataType: column.dataType,
          isNullable: column.isNullable,
          isPrimaryKey: column.isPrimaryKey,
          nullFraction: stat?.null_frac ?? null,
          distinctCount: distinct,
        }
        await this.db
          .insert(tables.catalogColumns)
          .values({
            schemaName: schema,
            tableName: table.name,
            columnName: column.name,
            description: "",
            ...technical,
          })
          .onConflictDoUpdate({
            target: [
              tables.catalogColumns.schemaName,
              tables.catalogColumns.tableName,
              tables.catalogColumns.columnName,
            ],
            set: technical,
          })
      }
    }

    await this.db
      .delete(tables.catalogLinks)
      .where(
        and(
          eq(tables.catalogLinks.fromSchema, schema),
          eq(tables.catalogLinks.kind, "foreign_key"),
        ),
      )
    const links = introspected.tables.flatMap((table) =>
      table.columns
        .filter((column) => column.references)
        .map((column) => ({
          fromSchema: schema,
          fromTable: table.name,
          fromColumn: column.name,
          toSchema: column.references?.schema ?? schema,
          toTable: column.references?.table ?? "",
          toColumn: column.references?.column ?? "",
          kind: "foreign_key" as const,
        })),
    )
    if (links.length > 0) {
      await this.db.insert(tables.catalogLinks).values(links).onConflictDoNothing()
    }
    return introspected.tables.length
  }

  private async sample(
    schema: string,
    table: string,
  ): Promise<{ columns: ColumnMeta[]; rows: CellValue[][] }> {
    const result = await this.engine.pools.admin.query({
      text: `SELECT * FROM ${qualified(schema, table)} LIMIT ${SAMPLE_ROWS}`,
      rowMode: "array",
    })
    await this.engine.typeNames.resolve(result.fields.map((field) => field.dataTypeID))
    const columns = result.fields.map((field) => ({
      name: field.name,
      dataType: this.engine.typeNames.nameOf(field.dataTypeID),
      dataTypeId: field.dataTypeID,
    }))
    const rows = (result.rows as unknown[][]).map((row) =>
      row.map((value): CellValue => {
        if (value === null || value === undefined) {
          return null
        }
        if (typeof value === "number" || typeof value === "boolean") {
          return value
        }
        const text = typeof value === "string" ? value : JSON.stringify(value)
        return text.length > SAMPLE_CELL_CHARS ? text.slice(0, SAMPLE_CELL_CHARS) : text
      }),
    )
    return { columns, rows }
  }
}
