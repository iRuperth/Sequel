import { z } from "zod"
import { readYamlAsset } from "./files"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

export const datasetSlugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,40}$/, "must be a lowercase identifier usable as a schema name")

export const datasetManifestEntrySchema = z.object({
  slug: datasetSlugSchema,
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().min(1),
  ownerTeam: z.string().min(1),
  displayOrder: z.number().int().positive(),
  tags: z.array(z.string().min(1)),
})
export type DatasetManifestEntry = z.infer<typeof datasetManifestEntrySchema>

export const datasetManifestSchema = z
  .object({ datasets: z.array(datasetManifestEntrySchema).min(1) })
  .superRefine((manifest, context) => {
    const slugs = new Set<string>()
    const orders = new Set<number>()
    for (const [index, entry] of manifest.datasets.entries()) {
      if (slugs.has(entry.slug)) {
        context.addIssue({
          code: "custom",
          path: ["datasets", index, "slug"],
          message: "duplicate slug",
        })
      }
      if (orders.has(entry.displayOrder)) {
        context.addIssue({
          code: "custom",
          path: ["datasets", index, "displayOrder"],
          message: "duplicate display order",
        })
      }
      slugs.add(entry.slug)
      orders.add(entry.displayOrder)
    }
  })
export type DatasetManifest = z.infer<typeof datasetManifestSchema>

export async function loadManifest(root: string): Promise<DatasetManifestEntry[]> {
  const manifest = await readYamlAsset(
    assetPath(root, DATASET_ASSET_PATHS.manifest),
    datasetManifestSchema,
  )
  return [...manifest.datasets].sort((left, right) => left.displayOrder - right.displayOrder)
}

export function findManifestEntry(
  entries: readonly DatasetManifestEntry[],
  slug: string,
): DatasetManifestEntry {
  const entry = entries.find((candidate) => candidate.slug === slug)
  if (!entry) {
    throw new Error(`Unknown dataset slug: ${slug}`)
  }
  return entry
}
