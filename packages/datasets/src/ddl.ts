import { readTextAsset } from "./files"
import { datasetSlugSchema } from "./manifest"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

export interface DatasetDdl {
  slug: string
  tablesSql: string
  constraintsSql: string
}

export async function readDatasetDdl(root: string, slug: string): Promise<DatasetDdl> {
  const validSlug = datasetSlugSchema.parse(slug)
  const directory = assetPath(root, DATASET_ASSET_PATHS.ddl, validSlug)
  const [tablesSql, constraintsSql] = await Promise.all([
    readTextAsset(assetPath(directory, DATASET_ASSET_PATHS.tablesSql)),
    readTextAsset(assetPath(directory, DATASET_ASSET_PATHS.constraintsSql)),
  ])
  return { slug: validSlug, tablesSql, constraintsSql }
}

const CREATE_TABLE_PATTERN =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[a-z_][a-z0-9_]*"?)\s*\(/gi

export function listDdlTables(tablesSql: string): string[] {
  return [...tablesSql.matchAll(CREATE_TABLE_PATTERN)].map((match) =>
    (match[1] ?? "").replaceAll('"', ""),
  )
}
