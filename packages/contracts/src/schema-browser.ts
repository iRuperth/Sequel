import { z } from "zod"
import { relationKindSchema, schemaKindSchema } from "./enums"

export const columnNodeSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  isNullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  references: z.object({ schema: z.string(), table: z.string(), column: z.string() }).nullable(),
})
export type ColumnNode = z.infer<typeof columnNodeSchema>

export const tableNodeSchema = z.object({
  name: z.string(),
  kind: relationKindSchema,
  rowEstimate: z.number().int().nullable(),
  columns: z.array(columnNodeSchema),
})
export type TableNode = z.infer<typeof tableNodeSchema>

export const schemaNodeSchema = z.object({
  name: z.string(),
  kind: schemaKindSchema,
  label: z.string(),
  tables: z.array(tableNodeSchema),
})
export type SchemaNode = z.infer<typeof schemaNodeSchema>

export const schemaTreeSchema = z.object({
  database: z.string(),
  schemas: z.array(schemaNodeSchema),
  refreshedAt: z.string(),
})
export type SchemaTree = z.infer<typeof schemaTreeSchema>
