import type { SchemaTree } from "@sequel/contracts"
import { schemaKindLabels } from "@sequel/copy"
import { tables, type Database } from "@sequel/db"
import { REDIS_KEYS } from "@sequel/queue"
import type { SqlEngine } from "@sequel/sql-engine"
import { asc } from "drizzle-orm"
import type { JsonCache } from "../../shared/cache"

export type DatasetRef = { slug: string; name: string }

const DATASET_LIST_TTL_MS = 30_000

export class WarehouseService {
  private datasetCache: { at: number; value: DatasetRef[] } | null = null

  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly cache: JsonCache,
    private readonly schemaTtlSeconds: number,
  ) {}

  async datasets(): Promise<DatasetRef[]> {
    if (this.datasetCache && Date.now() - this.datasetCache.at < DATASET_LIST_TTL_MS) {
      return this.datasetCache.value
    }
    const rows = await this.db
      .select({ slug: tables.catalogDatasets.slug, name: tables.catalogDatasets.name })
      .from(tables.catalogDatasets)
      .orderBy(asc(tables.catalogDatasets.displayOrder))
    this.datasetCache = { at: Date.now(), value: rows }
    return rows
  }

  async datasetSchemas(): Promise<string[]> {
    return (await this.datasets()).map((dataset) => dataset.slug)
  }

  async searchPath(scratchSchema: string | null): Promise<string[]> {
    const schemas = await this.datasetSchemas()
    return scratchSchema ? [scratchSchema, ...schemas] : schemas
  }

  async schemaTree(scratchSchema: string | null): Promise<SchemaTree> {
    const key = `${REDIS_KEYS.schemaCache}:${scratchSchema ?? "none"}`
    const cached = await this.cache.get<SchemaTree>(key)
    if (cached) {
      return cached
    }
    const datasets = await this.datasets()
    const names = datasets.map((dataset) => dataset.slug)
    const introspected = await this.engine.introspect(
      scratchSchema ? [...names, scratchSchema] : names,
    )
    const labels = new Map(datasets.map((dataset) => [dataset.slug, dataset.name]))
    const tree: SchemaTree = {
      database: await this.engine.databaseName(),
      refreshedAt: new Date().toISOString(),
      schemas: introspected.map((schema) => {
        const isScratch = schema.name === scratchSchema
        return {
          name: schema.name,
          kind: isScratch ? "scratch" : "dataset",
          label: labels.get(schema.name) ?? (isScratch ? schemaKindLabels.scratch : schema.name),
          tables: schema.tables,
        }
      }),
    }
    await this.cache.set(key, tree, this.schemaTtlSeconds)
    return tree
  }

  async invalidateSchemaTree(scratchSchema: string | null): Promise<void> {
    await this.cache.delete(`${REDIS_KEYS.schemaCache}:${scratchSchema ?? "none"}`)
  }

  async invalidateAll(): Promise<void> {
    this.datasetCache = null
    await this.cache.deleteByPrefix(REDIS_KEYS.schemaCache)
  }
}
