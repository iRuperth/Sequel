import { z } from "zod"
import { nullableTimestampSchema, rowSchema } from "./common"
import { linkKindSchema, relationKindSchema } from "./enums"
import { columnMetaSchema } from "./sql"

export const datasetSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  domain: z.string(),
  description: z.string(),
  ownerTeam: z.string(),
  displayOrder: z.number().int(),
  tags: z.array(z.string()),
  tableCount: z.number().int(),
  totalRows: z.number().int(),
  refreshedAt: nullableTimestampSchema,
})
export type DatasetSummary = z.infer<typeof datasetSummarySchema>

export const catalogTableSummarySchema = z.object({
  schema: z.string(),
  name: z.string(),
  kind: relationKindSchema,
  datasetSlug: z.string(),
  description: z.string(),
  grain: z.string().nullable(),
  ownerTeam: z.string(),
  tags: z.array(z.string()),
  rowCount: z.number().int().nullable(),
  columnCount: z.number().int(),
  refreshedAt: nullableTimestampSchema,
})
export type CatalogTableSummary = z.infer<typeof catalogTableSummarySchema>

export const catalogColumnSchema = z.object({
  name: z.string(),
  ordinal: z.number().int(),
  dataType: z.string(),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  description: z.string(),
  isPii: z.boolean(),
  exampleValues: z.array(z.string()),
  nullFraction: z.number().nullable(),
  distinctCount: z.number().nullable(),
})
export type CatalogColumn = z.infer<typeof catalogColumnSchema>

export const catalogLinkSchema = z.object({
  fromSchema: z.string(),
  fromTable: z.string(),
  fromColumn: z.string(),
  toSchema: z.string(),
  toTable: z.string(),
  toColumn: z.string(),
  kind: linkKindSchema,
})
export type CatalogLink = z.infer<typeof catalogLinkSchema>

export const catalogTableDetailSchema = catalogTableSummarySchema.extend({
  columns: z.array(catalogColumnSchema),
  sample: z.object({ columns: z.array(columnMetaSchema), rows: z.array(rowSchema) }),
  outgoing: z.array(catalogLinkSchema),
  incoming: z.array(catalogLinkSchema),
})
export type CatalogTableDetail = z.infer<typeof catalogTableDetailSchema>

export const datasetDetailSchema = datasetSummarySchema.extend({
  tables: z.array(catalogTableSummarySchema),
  links: z.array(catalogLinkSchema),
})
export type DatasetDetail = z.infer<typeof datasetDetailSchema>

export const datasetListSchema = z.object({ items: z.array(datasetSummarySchema) })

export const datasetParamsSchema = z.object({ slug: z.string().min(1) })
export const tableParamsSchema = z.object({ schema: z.string().min(1), table: z.string().min(1) })

export const catalogSearchQuerySchema = z.object({ q: z.string().max(200).optional() })
export const catalogSearchResultSchema = z.object({
  tables: z.array(catalogTableSummarySchema),
  columns: z.array(
    z.object({
      schema: z.string(),
      table: z.string(),
      column: z.string(),
      dataType: z.string(),
      description: z.string(),
    }),
  ),
})
export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>
