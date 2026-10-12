import { z } from "zod"
import { apiErrorCodeSchema } from "./enums"
import { LIMITS } from "./limits"

export const idSchema = z.string().uuid()
export const timestampSchema = z.string()
export const nullableTimestampSchema = timestampSchema.nullable()

export const idParamsSchema = z.object({ id: idSchema })
export type IdParams = z.infer<typeof idParamsSchema>

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).optional(),
})

export function pageSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })
}

export const cellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
export type CellValue = z.infer<typeof cellValueSchema>
export const rowSchema = z.array(cellValueSchema)
export type Row = z.infer<typeof rowSchema>

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: apiErrorCodeSchema,
  detail: z.string(),
  instance: z.string().optional(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
})
export type Problem = z.infer<typeof problemSchema>

export const tagsSchema = z
  .array(z.string().trim().min(1).max(LIMITS.tagMaxLength))
  .max(LIMITS.tagsMaxCount)

export const okSchema = z.object({ ok: z.literal(true) })
