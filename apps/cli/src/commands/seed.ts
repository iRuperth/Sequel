import type { CliConfig } from "@sequel/config"
import { createCore, packageDir, starterMockResponder, type Core } from "@sequel/core"
import {
  catalogLinks,
  loadAllDatasets,
  loadCatalogDocs,
  loadDashboardSeeds,
  loadManifest,
  loadQualityCheckSeeds,
  loadSavedQuerySeeds,
  loadStarterExercises,
} from "@sequel/datasets"
import type { Logger } from "../logger"

export type SeedOptions = { force: boolean }

const DATASETS_PACKAGE = "@sequel/datasets"

export async function seed(config: CliConfig, logger: Logger, options: SeedOptions) {
  const root = config.datasets.root ?? packageDir(DATASETS_PACKAGE)
  const core = createCore(config, logger, {
    applicationName: "sequel-cli",
    mockResponder: starterMockResponder(() => loadStarterExercises(root)),
  })
  try {
    await core.ready()
    await core.identity.ensureLocalUser()
    if (!options.force && (await core.catalog.isSeeded())) {
      logger.info("warehouse already seeded, use seed --force to reload")
      return
    }
    await loadWarehouse(core, config, root, logger)
    await seedCatalog(core, root, logger)
    await seedWorkspace(core, root, logger)
  } finally {
    await core.close()
  }
}

async function loadWarehouse(core: Core, config: CliConfig, root: string, logger: Logger) {
  const started = performance.now()
  const results = await loadAllDatasets(core.engine.pools.admin, root, {
    seed: config.datasets.seed,
    asOfDate: config.datasets.asOfDate,
    scale: config.datasets.scale,
    readerRole: config.bootstrap.roles.sandboxReader.name,
    writerRole: config.bootstrap.roles.sandboxWriter.name,
    onProgress: (event) => {
      if (event.phase === "done") {
        logger.info({ dataset: event.slug, elapsedMs: event.elapsedMs }, "dataset loaded")
      }
    },
  })
  logger.info(
    {
      datasets: results.length,
      rows: results.reduce((sum, result) => sum + result.totalRows, 0),
      durationMs: Math.round(performance.now() - started),
    },
    "warehouse loaded",
  )
}

async function seedCatalog(core: Core, root: string, logger: Logger) {
  const [manifest, docs] = await Promise.all([loadManifest(root), loadCatalogDocs(root)])
  await core.catalogSeeder.apply({
    datasets: manifest.map((entry) => ({ ...entry })),
    tables: docs.flatMap((doc) =>
      doc.tables.map((table) => ({
        schema: doc.dataset,
        table: table.name,
        description: table.description,
        grain: table.grain,
        ownerTeam: table.ownerTeam,
        tags: table.tags,
        columns: table.columns.map((column) => ({
          name: column.name,
          description: column.description,
          isPii: column.pii,
          exampleValues: column.exampleValues ?? [],
        })),
      })),
    ),
    links: docs.flatMap((doc) => catalogLinks(doc)),
  })
  await core.warehouse.invalidateAll()
  const tables = await core.catalogRefresher.refresh()
  logger.info({ tables }, "catalog seeded and refreshed")
}

async function seedWorkspace(core: Core, root: string, logger: Logger) {
  const userId = core.identity.currentUserId
  const exercises = await loadStarterExercises(root)
  const starters = await core.starterImporter.import(userId, exercises)
  logger.info(starters, "starter tickets imported")

  const savedQueryIds = new Map<string, string>()
  for (const query of await loadSavedQuerySeeds(root)) {
    const { key, ...input } = query
    savedQueryIds.set(key, await core.savedQueries.upsertSeed(userId, key, input))
  }
  for (const dashboard of await loadDashboardSeeds(root)) {
    const widgets = dashboard.widgets.map(({ savedQueryKey, ...widget }) => {
      const savedQueryId = savedQueryIds.get(savedQueryKey)
      if (!savedQueryId) {
        throw new Error(
          `Dashboard ${dashboard.key} references unknown saved query ${savedQueryKey}`,
        )
      }
      return { ...widget, savedQueryId }
    })
    await core.dashboards.upsertSeed(
      userId,
      dashboard.key,
      { name: dashboard.name, description: dashboard.description },
      widgets,
    )
  }
  for (const check of await loadQualityCheckSeeds(root)) {
    const { key, ...input } = check
    const id = await core.quality.upsertSeed(userId, key, input)
    await core.quality.execute(id)
  }
  logger.info({ savedQueries: savedQueryIds.size }, "workspace seeds applied")
}
