import { z } from "zod"
import { idSchema, nullableTimestampSchema, tagsSchema, timestampSchema } from "./common"
import { LIMITS } from "./limits"
import { sqlTextSchema } from "./sql"

export const savedQuerySchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  sqlText: z.string(),
  datasetSlug: z.string().nullable(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  lastRunAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export type SavedQuery = z.infer<typeof savedQuerySchema>

export const createSavedQueryRequestSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  description: z.string().max(LIMITS.descriptionMaxLength).nullable().optional(),
  sqlText: sqlTextSchema,
  datasetSlug: z.string().nullable().optional(),
  tags: tagsSchema.optional(),
  isFavorite: z.boolean().optional(),
})
export type CreateSavedQueryRequest = z.infer<typeof createSavedQueryRequestSchema>

export const updateSavedQueryRequestSchema = createSavedQueryRequestSchema.partial()
export type UpdateSavedQueryRequest = z.infer<typeof updateSavedQueryRequestSchema>

export const savedQueryListQuerySchema = z.object({
  search: z.string().max(LIMITS.searchMaxLength).optional(),
  favorites: z.enum(["true", "false"]).optional(),
})
export type SavedQueryListQuery = z.infer<typeof savedQueryListQuerySchema>

export const savedQueryListSchema = z.object({ items: z.array(savedQuerySchema) })
