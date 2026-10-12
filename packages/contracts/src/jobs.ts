import { z } from "zod"
import { nullableTimestampSchema, timestampSchema } from "./common"
import { jobKindSchema, jobStatusSchema } from "./enums"
import { LIMITS } from "./limits"

export const jobSnapshotSchema = z.object({
  id: z.string(),
  kind: jobKindSchema,
  status: jobStatusSchema,
  progress: z.number().int().min(0).max(100),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  subjectId: z.string().nullable(),
  attempts: z.number().int(),
  createdAt: timestampSchema,
  startedAt: nullableTimestampSchema,
  finishedAt: nullableTimestampSchema,
})
export type JobSnapshot = z.infer<typeof jobSnapshotSchema>

export const jobParamsSchema = z.object({ id: z.string().min(1) })

export const jobListQuerySchema = z.object({
  kind: jobKindSchema.optional(),
  status: jobStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).optional(),
})
export type JobListQuery = z.infer<typeof jobListQuerySchema>

export const jobListSchema = z.object({ items: z.array(jobSnapshotSchema) })

export const JOB_EVENT_NAMES = { snapshot: "snapshot", heartbeat: "heartbeat" } as const
