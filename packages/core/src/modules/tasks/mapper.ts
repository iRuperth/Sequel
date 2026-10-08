import type { Submission, TaskDetail, TaskHint, TaskSummary } from "@sequel/contracts"
import type { taskHints, tasks, taskSubmissions } from "@sequel/db"
import { iso, isoOrNull } from "../../shared/time"

export type TaskRow = typeof tasks.$inferSelect
export type SubmissionRow = typeof taskSubmissions.$inferSelect
export type HintRow = typeof taskHints.$inferSelect

export const ticketKey = (prefix: string, row: Pick<TaskRow, "ticketNumber">) =>
  `${prefix}-${row.ticketNumber}`

export function toTaskSummary(row: TaskRow, prefix: string, attempts: number): TaskSummary {
  return {
    id: row.id,
    ticketKey: ticketKey(prefix, row),
    title: row.title,
    status: row.status,
    source: row.source,
    track: row.track,
    difficulty: row.difficulty,
    topics: row.topics,
    datasetSlugs: row.datasetSlugs,
    mode: row.mode,
    stakeholder: row.stakeholder,
    estimatedMinutes: row.estimatedMinutes,
    attempts,
    createdAt: iso(row.createdAt),
    solvedAt: isoOrNull(row.solvedAt),
  }
}

export function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    taskId: row.taskId,
    sqlText: row.sqlText,
    status: row.status,
    verdict: row.verdict,
    comparison: row.comparison,
    error: row.error,
    durationMs: row.durationMs,
    jobId: row.jobId,
    feedbackStatus: row.feedbackStatus,
    feedback: row.feedback,
    submittedAt: iso(row.submittedAt),
    gradedAt: isoOrNull(row.gradedAt),
  }
}

export function toHint(row: HintRow): TaskHint {
  return {
    position: row.position,
    body: row.revealedAt ? row.body : null,
    revealed: row.revealedAt !== null,
  }
}

export function solutionVisible(row: TaskRow): boolean {
  return row.status === "solved" || row.status === "abandoned"
}

export function toTaskDetail(input: {
  row: TaskRow
  prefix: string
  attempts: number
  hints: HintRow[]
  latestSubmission: SubmissionRow | null
  generation: TaskDetail["generation"]
}): TaskDetail {
  const { row } = input
  return {
    ...toTaskSummary(row, input.prefix, input.attempts),
    businessContext: row.businessContext,
    requirements: row.requirements,
    acceptanceCriteria: row.acceptanceCriteria,
    expectedColumns: row.expectedColumns,
    orderMatters: row.orderMatters,
    hints: input.hints.map(toHint),
    solution:
      solutionVisible(row) && row.referenceSql
        ? { referenceSql: row.referenceSql, explanation: row.explanation ?? "" }
        : null,
    generation: input.generation,
    latestSubmission: input.latestSubmission ? toSubmission(input.latestSubmission) : null,
    draftSql: row.draftSql,
  }
}
