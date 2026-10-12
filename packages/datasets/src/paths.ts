import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const DATASET_ASSET_PATHS = {
  manifest: "manifest.yaml",
  ddl: "ddl",
  pools: "pools",
  catalog: "catalog",
  exercises: "exercises",
  seeds: "seeds",
  tablesSql: "tables.sql",
  constraintsSql: "constraints.sql",
  qualityChecks: "quality-checks.yaml",
  savedQueries: "saved-queries.yaml",
  dashboards: "dashboards.yaml",
} as const

export function defaultDatasetsRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..")
}

export function assetPath(root: string, ...segments: string[]): string {
  return join(root, ...segments)
}
