import type { CatalogLink } from "@sequel/contracts"
import { z } from "zod"
import { readYamlAsset } from "./files"
import { datasetSlugSchema, loadManifest } from "./manifest"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

const identifierSchema = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/, "must be a lowercase SQL identifier")
const exampleValueSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((value) => String(value))

export const catalogColumnDocSchema = z.object({
  name: identifierSchema,
  description: z.string().min(1),
  pii: z.boolean(),
  exampleValues: z.array(exampleValueSchema).optional(),
})
export type CatalogColumnDoc = z.infer<typeof catalogColumnDocSchema>

export const catalogTableDocSchema = z.object({
  name: identifierSchema,
  description: z.string().min(1),
  grain: z.string().min(1),
  ownerTeam: z.string().min(1),
  tags: z.array(z.string().min(1)),
  columns: z.array(catalogColumnDocSchema).min(1),
})
export type CatalogTableDoc = z.infer<typeof catalogTableDocSchema>

export const catalogLinkDocSchema = z.object({
  fromTable: identifierSchema,
  fromColumn: identifierSchema,
  toSchema: datasetSlugSchema.optional(),
  toTable: identifierSchema,
  toColumn: identifierSchema,
  description: z.string().min(1),
})
export type CatalogLinkDoc = z.infer<typeof catalogLinkDocSchema>

export const catalogDocSchema = z
  .object({
    dataset: datasetSlugSchema,
    tables: z.array(catalogTableDocSchema).min(1),
    links: z.array(catalogLinkDocSchema).default([]),
  })
  .superRefine((doc, context) => {
    const tables = new Map<string, Set<string>>()
    doc.tables.forEach((table, tableIndex) => {
      if (tables.has(table.name)) {
        context.addIssue({
          code: "custom",
          path: ["tables", tableIndex, "name"],
          message: "duplicate table",
        })
      }
      const columns = new Set<string>()
      table.columns.forEach((column, columnIndex) => {
        if (columns.has(column.name)) {
          context.addIssue({
            code: "custom",
            path: ["tables", tableIndex, "columns", columnIndex, "name"],
            message: "duplicate column",
          })
        }
        columns.add(column.name)
      })
      tables.set(table.name, columns)
    })
    doc.links.forEach((link, linkIndex) => {
      if (!tables.get(link.fromTable)?.has(link.fromColumn)) {
        context.addIssue({
          code: "custom",
          path: ["links", linkIndex],
          message: "unknown source column",
        })
      }
      const sameDataset = link.toSchema === undefined || link.toSchema === doc.dataset
      if (sameDataset && !tables.get(link.toTable)?.has(link.toColumn)) {
        context.addIssue({
          code: "custom",
          path: ["links", linkIndex],
          message: "unknown target column",
        })
      }
    })
  })
export type CatalogDoc = z.infer<typeof catalogDocSchema>

export async function loadCatalogDoc(root: string, slug: string): Promise<CatalogDoc> {
  const path = assetPath(root, DATASET_ASSET_PATHS.catalog, `${datasetSlugSchema.parse(slug)}.yaml`)
  const doc = await readYamlAsset(path, catalogDocSchema)
  if (doc.dataset !== slug) {
    throw new Error(`${path}: declares dataset ${doc.dataset} but the file belongs to ${slug}`)
  }
  return doc
}

export async function loadCatalogDocs(root: string): Promise<CatalogDoc[]> {
  const manifest = await loadManifest(root)
  return Promise.all(manifest.map((entry) => loadCatalogDoc(root, entry.slug)))
}

export function catalogLinks(doc: CatalogDoc): CatalogLink[] {
  return doc.links.map((link) => ({
    fromSchema: doc.dataset,
    fromTable: link.fromTable,
    fromColumn: link.fromColumn,
    toSchema: link.toSchema ?? doc.dataset,
    toTable: link.toTable,
    toColumn: link.toColumn,
    kind: "logical",
  }))
}
