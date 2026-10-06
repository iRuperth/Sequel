import type { JobKind } from "@sequel/contracts"

export const QUEUE_NAMES = {
  tasks: "sequel-tasks",
  grading: "sequel-grading",
  operations: "sequel-operations",
} as const

export type QueueKey = keyof typeof QUEUE_NAMES
export type QueueName = (typeof QUEUE_NAMES)[QueueKey]

export const QUEUE_FOR_JOB: Record<JobKind, QueueKey> = {
  task_generate: "tasks",
  submission_feedback: "tasks",
  task_grade: "grading",
  scheduled_query: "operations",
  quality_check: "operations",
  catalog_refresh: "operations",
  scratch_sweep: "operations",
}

export const REDIS_KEYS = {
  prefix: "sequel",
  workerHeartbeat: "sequel:worker:heartbeat",
  jobChannelPrefix: "sequel:jobs:",
  jobChannelPattern: "sequel:jobs:*",
  schemaCache: "sequel:cache:schema",
  dashboardCachePrefix: "sequel:cache:dashboard:",
  runningQueryPrefix: "sequel:running-query:",
} as const

export const SCHEDULER_KEYS = {
  scratchSweep: "maintenance:scratch-sweep",
  catalogRefresh: "maintenance:catalog-refresh",
  scheduledQueryPrefix: "scheduled-query:",
  qualityCheckPrefix: "quality-check:",
} as const

export function jobChannel(jobId: string): string {
  return `${REDIS_KEYS.jobChannelPrefix}${jobId}`
}
