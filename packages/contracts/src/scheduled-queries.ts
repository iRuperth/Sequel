import { z } from "zod"
import { idSchema, nullableTimestampSchema, timestampSchema } from "./common"
import { runStatusSchema } from "./enums"
import { LIMITS } from "./limits"

export const scheduledQuerySchema = z.object({
  id: idSchema,
  name: z.string(),
  savedQueryId: idSchema,
  savedQueryName: z.string(),
  cronExpression: z.string(),
  timezone: z.string(),
  isEnabled: z.boolean(),
  lastRunAt: nullableTimestampSchema,
  lastStatus: runStatusSchema.nullable(),
  nextRunAt: nullableTimestampSchema,
  createdAt: timestampSchema,
})
export type ScheduledQuery = z.infer<typeof scheduledQuerySchema>

export const scheduledQueryListSchema = z.object({ items: z.array(scheduledQuerySchema) })

export const upsertScheduledQueryRequestSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  savedQueryId: idSchema,
  cronExpression: z.string().trim().min(1).max(LIMITS.cronMaxLength),
  timezone: z.string().trim().min(1),
  isEnabled: z.boolean(),
})
export type UpsertScheduledQueryRequest = z.infer<typeof upsertScheduledQueryRequestSchema>

export const scheduledRunSchema = z.object({
  id: idSchema,
  status: runStatusSchema,
  rowCount: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  error: z.string().nullable(),
  startedAt: timestampSchema,
  finishedAt: nullableTimestampSchema,
})
export type ScheduledRun = z.infer<typeof scheduledRunSchema>

export const scheduledRunListSchema = z.object({ items: z.array(scheduledRunSchema) })

export const runTriggeredSchema = z.object({ jobId: z.string() })
