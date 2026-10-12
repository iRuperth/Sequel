import type { JobKind } from "@sequel/contracts"
import { jobStageLabels } from "@sequel/copy"
import type { Core, JobProgressReporter } from "@sequel/core"
import { jobPayloadSchemas, type JobPayloads } from "@sequel/queue"

export type ProcessorContext = { core: Core }

type Handler<K extends JobKind> = (
  payload: JobPayloads[K],
  report: JobProgressReporter,
  context: ProcessorContext,
) => Promise<void>

export type ProcessorMap = { [K in JobKind]: Handler<K> }

export const processors: ProcessorMap = {
  task_generate: (payload, report, { core }) => core.generator.generate(payload.taskId, report),
  task_grade: async (payload, report, { core }) => {
    await core.grader.grade(payload.submissionId, report)
  },
  submission_feedback: (payload, report, { core }) =>
    core.reviewer.review(payload.submissionId, report),
  scheduled_query: async (payload, report, { core }) => {
    await report(10, jobStageLabels.running)
    const status = await core.scheduledQueries.execute(payload.scheduledQueryId)
    if (status === "failed") {
      throw new Error(`Scheduled query ${payload.scheduledQueryId} failed`)
    }
  },
  quality_check: async (payload, report, { core }) => {
    await report(10, jobStageLabels.running)
    await core.quality.execute(payload.qualityCheckId)
  },
  catalog_refresh: async (_payload, report, { core }) => {
    await core.catalogRefresher.refresh((progress, stage) =>
      report(progress, `${jobStageLabels.refreshingCatalog}: ${stage}`),
    )
  },
  scratch_sweep: async (_payload, report, { core }) => {
    await report(10, jobStageLabels.running)
    await core.sandbox.sweep()
  },
}

export function subjectOf(kind: JobKind, payload: unknown): string | null {
  const parsed = jobPayloadSchemas[kind].safeParse(payload)
  if (!parsed.success) {
    return null
  }
  const data = parsed.data as Record<string, unknown>
  const value =
    data["taskId"] ?? data["submissionId"] ?? data["scheduledQueryId"] ?? data["qualityCheckId"]
  return typeof value === "string" ? value : null
}

export function userOf(payload: unknown): string | null {
  const value = (payload as Record<string, unknown> | null)?.["userId"]
  return typeof value === "string" ? value : null
}
