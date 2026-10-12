import { z } from "zod"
import { idSchema, nullableTimestampSchema, timestampSchema } from "./common"
import { qualityCheckKindSchema, qualityRunStatusSchema, severitySchema } from "./enums"
import { LIMITS } from "./limits"

export const qualityCheckConfigSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  maxAgeHours: z.number().nullable(),
  acceptedValues: z.array(z.string()),
  sql: z.string().nullable(),
})
export type QualityCheckConfig = z.infer<typeof qualityCheckConfigSchema>

export const qualityRunSchema = z.object({
  id: idSchema,
  status: qualityRunStatusSchema,
  observedValue: z.string().nullable(),
  message: z.string(),
  durationMs: z.number().int().nullable(),
  ranAt: timestampSchema,
})
export type QualityRun = z.infer<typeof qualityRunSchema>

export const qualityCheckSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  kind: qualityCheckKindSchema,
  targetSchema: z.string(),
  targetTable: z.string(),
  targetColumn: z.string().nullable(),
  config: qualityCheckConfigSchema,
  severity: severitySchema,
  isEnabled: z.boolean(),
  cronExpression: z.string().nullable(),
  lastRun: qualityRunSchema.nullable(),
  createdAt: timestampSchema,
})
export type QualityCheck = z.infer<typeof qualityCheckSchema>

export const qualityCheckListSchema = z.object({ items: z.array(qualityCheckSchema) })

export const upsertQualityCheckRequestSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  description: z.string().max(LIMITS.descriptionMaxLength).nullable().optional(),
  kind: qualityCheckKindSchema,
  targetSchema: z.string().min(1),
  targetTable: z.string().min(1),
  targetColumn: z.string().nullable(),
  config: qualityCheckConfigSchema,
  severity: severitySchema,
  isEnabled: z.boolean(),
  cronExpression: z.string().max(LIMITS.cronMaxLength).nullable(),
})
export type UpsertQualityCheckRequest = z.infer<typeof upsertQualityCheckRequestSchema>

export const qualityRunListSchema = z.object({ items: z.array(qualityRunSchema) })

export const qualityOverviewSchema = z.object({
  total: z.number().int(),
  passing: z.number().int(),
  failing: z.number().int(),
  erroring: z.number().int(),
  neverRun: z.number().int(),
  lastRunAt: nullableTimestampSchema,
})
export type QualityOverview = z.infer<typeof qualityOverviewSchema>
