import {
  LIMITS,
  sqlTextSchema,
  tagsSchema,
  upsertQualityCheckRequestSchema,
  upsertWidgetRequestSchema,
} from "@sequel/contracts"
import { z } from "zod"
import { readYamlAsset } from "./files"
import { datasetSlugSchema } from "./manifest"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

export const seedKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "must be a lowercase key")

export const qualityCheckSeedSchema = upsertQualityCheckRequestSchema.extend({ key: seedKeySchema })
export type QualityCheckSeed = z.infer<typeof qualityCheckSeedSchema>

export const savedQuerySeedSchema = z.object({
  key: seedKeySchema,
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  description: z.string().max(LIMITS.descriptionMaxLength).nullable(),
  datasetSlug: datasetSlugSchema,
  tags: tagsSchema,
  sqlText: sqlTextSchema,
})
export type SavedQuerySeed = z.infer<typeof savedQuerySeedSchema>

export const dashboardWidgetSeedSchema = upsertWidgetRequestSchema
  .omit({ savedQueryId: true })
  .extend({ savedQueryKey: seedKeySchema })
export type DashboardWidgetSeed = z.infer<typeof dashboardWidgetSeedSchema>

export const dashboardSeedSchema = z.object({
  key: seedKeySchema,
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  description: z.string().max(LIMITS.descriptionMaxLength).nullable(),
  widgets: z.array(dashboardWidgetSeedSchema).min(1),
})
export type DashboardSeed = z.infer<typeof dashboardSeedSchema>

function uniqueKeys<T extends { key: string }>(
  items: readonly T[],
  context: z.RefinementCtx,
  field: string,
) {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    if (seen.has(item.key)) {
      context.addIssue({ code: "custom", path: [field, index, "key"], message: "duplicate key" })
    }
    seen.add(item.key)
  })
}

const qualityCheckSeedFileSchema = z
  .object({ checks: z.array(qualityCheckSeedSchema).min(1) })
  .superRefine((file, context) => uniqueKeys(file.checks, context, "checks"))
const savedQuerySeedFileSchema = z
  .object({ queries: z.array(savedQuerySeedSchema).min(1) })
  .superRefine((file, context) => uniqueKeys(file.queries, context, "queries"))
const dashboardSeedFileSchema = z
  .object({ dashboards: z.array(dashboardSeedSchema).min(1) })
  .superRefine((file, context) => {
    uniqueKeys(file.dashboards, context, "dashboards")
    file.dashboards.forEach((dashboard, dashboardIndex) => {
      dashboard.widgets.forEach((widget, widgetIndex) => {
        if (widget.position.x + widget.position.w > LIMITS.widgetGridColumns) {
          context.addIssue({
            code: "custom",
            path: ["dashboards", dashboardIndex, "widgets", widgetIndex, "position"],
            message: `widget overflows the ${LIMITS.widgetGridColumns} column grid`,
          })
        }
      })
    })
  })

function seedPath(root: string, file: string): string {
  return assetPath(root, DATASET_ASSET_PATHS.seeds, file)
}

export async function loadQualityCheckSeeds(root: string): Promise<QualityCheckSeed[]> {
  const file = await readYamlAsset(
    seedPath(root, DATASET_ASSET_PATHS.qualityChecks),
    qualityCheckSeedFileSchema,
  )
  return file.checks
}

export async function loadSavedQuerySeeds(root: string): Promise<SavedQuerySeed[]> {
  const file = await readYamlAsset(
    seedPath(root, DATASET_ASSET_PATHS.savedQueries),
    savedQuerySeedFileSchema,
  )
  return file.queries
}

export async function loadDashboardSeeds(root: string): Promise<DashboardSeed[]> {
  const [file, queries] = await Promise.all([
    readYamlAsset(seedPath(root, DATASET_ASSET_PATHS.dashboards), dashboardSeedFileSchema),
    loadSavedQuerySeeds(root),
  ])
  const known = new Set(queries.map((query) => query.key))
  for (const dashboard of file.dashboards) {
    for (const widget of dashboard.widgets) {
      if (!known.has(widget.savedQueryKey)) {
        throw new Error(
          `Dashboard ${dashboard.key} references unknown saved query ${widget.savedQueryKey}`,
        )
      }
    }
  }
  return file.dashboards
}
