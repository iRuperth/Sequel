import type { JobKind } from "@sequel/contracts"
import { z } from "zod"

export const jobPayloadSchemas = {
  task_generate: z.object({ taskId: z.string().uuid(), userId: z.string().uuid() }),
  task_grade: z.object({ submissionId: z.string().uuid() }),
  submission_feedback: z.object({ submissionId: z.string().uuid() }),
  scheduled_query: z.object({ scheduledQueryId: z.string().uuid() }),
  quality_check: z.object({ qualityCheckId: z.string().uuid() }),
  catalog_refresh: z.object({}),
  scratch_sweep: z.object({}),
} satisfies Record<JobKind, z.ZodType>

export type JobPayloads = { [K in JobKind]: z.infer<(typeof jobPayloadSchemas)[K]> }
export type JobPayload<K extends JobKind> = JobPayloads[K]
