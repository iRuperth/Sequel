import type { JobKind, JobStatus } from "@sequel/contracts"
import { TERMINAL_JOB_STATUSES } from "@sequel/contracts"
import { QUERY_ROOTS, type QueryRoot } from "@/lib/query-keys"

export const JOB_INVALIDATIONS: Record<JobKind, readonly QueryRoot[]> = {
  task_generate: [QUERY_ROOTS.tasks, QUERY_ROOTS.progress, QUERY_ROOTS.jobs],
  task_grade: [QUERY_ROOTS.tasks, QUERY_ROOTS.progress, QUERY_ROOTS.history, QUERY_ROOTS.jobs],
  submission_feedback: [QUERY_ROOTS.tasks, QUERY_ROOTS.jobs],
  scheduled_query: [QUERY_ROOTS.scheduledQueries, QUERY_ROOTS.history, QUERY_ROOTS.jobs],
  quality_check: [QUERY_ROOTS.qualityChecks, QUERY_ROOTS.history, QUERY_ROOTS.jobs],
  catalog_refresh: [QUERY_ROOTS.catalog, QUERY_ROOTS.schema, QUERY_ROOTS.jobs],
  scratch_sweep: [QUERY_ROOTS.sandbox, QUERY_ROOTS.schema, QUERY_ROOTS.jobs],
}

export function isTerminalJobStatus(status: JobStatus | null | undefined): boolean {
  return status ? TERMINAL_JOB_STATUSES.includes(status) : false
}
