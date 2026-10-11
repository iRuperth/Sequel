import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { loadCatalogDocs, type CatalogDoc } from "./catalog"
import { listDdlTables, readDatasetDdl } from "./ddl"
import { loadStarterExercises } from "./exercises"
import { generateDatasetWithPools, hasGenerator } from "./generator"
import { loadManifest, type DatasetManifestEntry } from "./manifest"
import { DATASET_ASSET_PATHS, defaultDatasetsRoot } from "./paths"
import { loadPools, type Pools } from "./pools"
import { loadDashboardSeeds, loadQualityCheckSeeds, loadSavedQuerySeeds } from "./seeds"

const ROOT = defaultDatasetsRoot()
const DATA_DIRECTORIES = [
  DATASET_ASSET_PATHS.ddl,
  DATASET_ASSET_PATHS.pools,
  DATASET_ASSET_PATHS.catalog,
  DATASET_ASSET_PATHS.exercises,
  DATASET_ASSET_PATHS.seeds,
]
const FORBIDDEN_DASHES = [0x2014, 0x2013].map((codePoint) => String.fromCodePoint(codePoint))
const DDL_KEYWORDS = new Set(["primary", "check", "unique", "constraint", "foreign"])
const SAMPLE_INPUT = { seed: 1, asOfDate: "2026-06-30", scale: 0.02 }

async function listDataFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? listDataFiles(path) : [path]
    }),
  )
  return files.flat()
}

function ddlColumns(tablesSql: string): Map<string, string[]> {
  const tables = new Map<string, string[]>()
  let current: string[] | null = null
  for (const line of tablesSql.split("\n")) {
    const create = /^CREATE TABLE ([a-z_][a-z0-9_]*) \($/.exec(line)
    if (create) {
      current = []
      tables.set(create[1] as string, current)
      continue
    }
    if (line.startsWith(")")) {
      current = null
      continue
    }
    const column = /^ {2}([a-z_][a-z0-9_]*) /.exec(line)
    if (current && column && !DDL_KEYWORDS.has((column[1] as string).toLowerCase())) {
      current.push(column[1] as string)
    }
  }
  return tables
}

describe("dataset assets", () => {
  let manifest: DatasetManifestEntry[]
  let pools: Pools
  let catalog: CatalogDoc[]

  beforeAll(async () => {
    manifest = await loadManifest(ROOT)
    pools = await loadPools(ROOT)
    catalog = await loadCatalogDocs(ROOT)
  })

  it("lists the five datasets in display order with fintech first", () => {
    expect(manifest.map((entry) => entry.slug)).toEqual([
      "fintech",
      "ecommerce",
      "hr",
      "web",
      "finance",
    ])
    for (const entry of manifest) {
      expect(hasGenerator(entry.slug)).toBe(true)
    }
  })

  it("keeps DDL, generator columns and catalog documentation aligned", async () => {
    for (const entry of manifest) {
      const ddl = await readDatasetDdl(ROOT, entry.slug)
      const ddlTables = ddlColumns(ddl.tablesSql)
      const dataset = generateDatasetWithPools(entry.slug, SAMPLE_INPUT, pools)
      const doc = catalog.find((candidate) => candidate.dataset === entry.slug)
      expect(doc, entry.slug).toBeDefined()
      expect(listDdlTables(ddl.tablesSql).sort()).toEqual(
        dataset.tables.map((table) => table.name).sort(),
      )
      expect(doc?.tables.map((table) => table.name)).toEqual(
        dataset.tables.map((table) => table.name),
      )
      for (const table of dataset.tables) {
        expect(ddlTables.get(table.name), `${entry.slug}.${table.name}`).toEqual([...table.columns])
        const documented = doc?.tables.find((candidate) => candidate.name === table.name)
        expect(
          documented?.columns.map((column) => column.name),
          `${entry.slug}.${table.name}`,
        ).toEqual([...table.columns])
      }
    }
  })

  it("validates every starter exercise", async () => {
    const exercises = await loadStarterExercises(ROOT)
    const bySlug = (slug: string) =>
      exercises.filter((exercise) => exercise.datasetSlugs[0] === slug)
    expect(bySlug("fintech")).toHaveLength(10)
    for (const slug of ["ecommerce", "hr", "web", "finance"]) {
      expect(bySlug(slug)).toHaveLength(2)
    }
    expect(exercises[0]?.key).toBe("fintech-001")
    expect(new Set(exercises.map((exercise) => exercise.track)).size).toBe(3)
    expect(exercises.some((exercise) => exercise.mode === "scratch")).toBe(true)
    for (const exercise of exercises) {
      const resultSql =
        exercise.mode === "read" ? exercise.referenceSql : (exercise.verificationSql ?? "")
      expect(resultSql, exercise.key).toMatch(/ORDER BY/i)
    }
  })

  it("validates the platform seeds", async () => {
    const [checks, queries, dashboards] = await Promise.all([
      loadQualityCheckSeeds(ROOT),
      loadSavedQuerySeeds(ROOT),
      loadDashboardSeeds(ROOT),
    ])
    expect(checks.length).toBeGreaterThanOrEqual(8)
    expect(checks.length).toBeLessThanOrEqual(12)
    expect(
      checks.some(
        (check) =>
          check.kind === "not_null" &&
          check.targetSchema === "fintech" &&
          check.targetTable === "transactions" &&
          check.targetColumn === "merchant_id",
      ),
    ).toBe(true)
    expect(queries.length).toBeGreaterThanOrEqual(6)
    expect(queries.length).toBeLessThanOrEqual(10)
    expect(dashboards.length).toBeGreaterThanOrEqual(1)
    const slugs = new Set(manifest.map((entry) => entry.slug))
    for (const check of checks) {
      expect(slugs.has(check.targetSchema)).toBe(true)
    }
    for (const query of queries) {
      expect(slugs.has(query.datasetSlug)).toBe(true)
    }
  })

  it("keeps data files free of comments and long dashes", async () => {
    const files = (
      await Promise.all(DATA_DIRECTORIES.map((directory) => listDataFiles(join(ROOT, directory))))
    ).flat()
    files.push(join(ROOT, DATASET_ASSET_PATHS.manifest))
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) {
      const text = await readFile(file, "utf8")
      const name = relative(ROOT, file)
      for (const dash of FORBIDDEN_DASHES) {
        expect(text.includes(dash), name).toBe(false)
      }
      if (file.endsWith(".sql") || file.endsWith(".json")) {
        expect(text.includes("--"), name).toBe(false)
        expect(text.includes("/*"), name).toBe(false)
      }
      if (file.endsWith(".yaml")) {
        expect(/(^|\s)#/m.test(text), name).toBe(false)
      }
    }
  })
})
