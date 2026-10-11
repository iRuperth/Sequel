import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type pg from "pg"
import { from as copyFrom } from "pg-copy-streams"
import { csvChunks } from "./csv"
import { readDatasetDdl } from "./ddl"
import { generateDatasetWithPools, hasGenerator } from "./generator"
import type { GeneratedTable, GeneratorInput } from "./generator/types"
import { loadManifest } from "./manifest"
import { loadPools, type Pools } from "./pools"

export type LoadPhase = "schema" | "table" | "constraints" | "analyze" | "grants" | "done"

export interface LoadProgressEvent {
  slug: string
  phase: LoadPhase
  table: string | null
  rows: number | null
  elapsedMs: number
}

export interface LoadDatasetOptions extends GeneratorInput {
  readerRole: string
  writerRole: string
  onProgress?: (event: LoadProgressEvent) => void
}

export interface TableLoadResult {
  table: string
  rows: number
}

export interface DatasetLoadResult {
  slug: string
  tables: TableLoadResult[]
  totalRows: number
  durationMs: number
}

const LOAD_SESSION_SETTINGS = [
  "SET LOCAL synchronous_commit = off",
  "SET LOCAL maintenance_work_mem = '256MB'",
  "SET LOCAL statement_timeout = 0",
  "SET LOCAL lock_timeout = '60s'",
  "SET LOCAL TIME ZONE 'UTC'",
]

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function copyTable(client: pg.PoolClient, table: GeneratedTable): Promise<number> {
  const columns = table.columns.map(quoteIdentifier).join(", ")
  const statement = `COPY ${quoteIdentifier(table.name)} (${columns}) FROM STDIN WITH (FORMAT csv)`
  const stream = client.query(copyFrom(statement))
  await pipeline(Readable.from(csvChunks(table.rows())), stream)
  return stream.rowCount
}

async function loadWithPools(
  pool: pg.Pool,
  root: string,
  slug: string,
  options: LoadDatasetOptions,
  pools: Pools,
): Promise<DatasetLoadResult> {
  if (!hasGenerator(slug)) {
    throw new Error(`No generator is registered for dataset ${slug}`)
  }
  const started = performance.now()
  const elapsed = () => Math.round(performance.now() - started)
  const report = (phase: LoadPhase, table: string | null = null, rows: number | null = null) =>
    options.onProgress?.({ slug, phase, table, rows, elapsedMs: elapsed() })
  const ddl = await readDatasetDdl(root, slug)
  const schema = quoteIdentifier(slug)
  const roles = [options.readerRole, options.writerRole].map(quoteIdentifier).join(", ")
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const setting of LOAD_SESSION_SETTINGS) {
      await client.query(setting)
    }
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await client.query(`CREATE SCHEMA ${schema}`)
    await client.query(`SET LOCAL search_path TO ${schema}`)
    await client.query(ddl.tablesSql)
    report("schema")
    const dataset = generateDatasetWithPools(
      slug,
      { seed: options.seed, asOfDate: options.asOfDate, scale: options.scale },
      pools,
    )
    const tables: TableLoadResult[] = []
    for (const table of dataset.tables) {
      const rows = await copyTable(client, table)
      if (rows !== table.rowCount) {
        throw new Error(
          `Loaded ${rows} rows into ${slug}.${table.name} but generated ${table.rowCount}`,
        )
      }
      tables.push({ table: table.name, rows })
      report("table", table.name, rows)
    }
    await client.query(ddl.constraintsSql)
    report("constraints")
    for (const table of tables) {
      await client.query(`ANALYZE ${quoteIdentifier(table.table)}`)
    }
    report("analyze")
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${roles}`)
    await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${roles}`)
    report("grants")
    await client.query("COMMIT")
    const totalRows = tables.reduce((sum, table) => sum + table.rows, 0)
    report("done", null, totalRows)
    return { slug, tables, totalRows, durationMs: elapsed() }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export async function loadDataset(
  pool: pg.Pool,
  root: string,
  slug: string,
  options: LoadDatasetOptions,
): Promise<DatasetLoadResult> {
  const pools = await loadPools(root)
  return loadWithPools(pool, root, slug, options, pools)
}

export async function loadAllDatasets(
  pool: pg.Pool,
  root: string,
  options: LoadDatasetOptions,
): Promise<DatasetLoadResult[]> {
  const [manifest, pools] = await Promise.all([loadManifest(root), loadPools(root)])
  const results: DatasetLoadResult[] = []
  for (const entry of manifest) {
    results.push(await loadWithPools(pool, root, entry.slug, options, pools))
  }
  return results
}
