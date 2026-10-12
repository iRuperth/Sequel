import { reviewFeedbackSchema } from "@sequel/contracts"
import { comparisonNoteLabels, difficultyLabels, jobStageLabels } from "@sequel/copy"
import { tables, type Database } from "@sequel/db"
import { buildSubmissionReviewPrompt, type LlmProvider } from "@sequel/llm"
import { eq } from "drizzle-orm"
import type { JobProgressReporter } from "../jobs/service"

export class SubmissionReviewer {
  constructor(
    private readonly db: Database,
    private readonly provider: LlmProvider,
    private readonly companyName: string,
  ) {}

  async review(submissionId: string, report: JobProgressReporter): Promise<void> {
    const submission = await this.db.query.taskSubmissions.findFirst({
      where: eq(tables.taskSubmissions.id, submissionId),
    })
    if (!submission || !submission.verdict) {
      throw new Error(`Submission ${submissionId} is not graded`)
    }
    const task = await this.db.query.tasks.findFirst({
      where: eq(tables.tasks.id, submission.taskId),
    })
    if (!task?.referenceSql) {
      throw new Error(`Task ${submission.taskId} has no reference solution`)
    }
    await report(20, jobStageLabels.reviewing)
    const comparison = submission.comparison
    const gradingSummary = comparison
      ? [
          `Expected ${comparison.expectedRowCount} rows and ${comparison.expectedColumns.length} columns; got ${comparison.actualRowCount} rows and ${comparison.actualColumns.length} columns.`,
          `Missing rows: ${comparison.missingRowCount}. Extra rows: ${comparison.extraRowCount}.`,
          ...comparison.notes.map((note) => comparisonNoteLabels[note]),
        ].join(" ")
      : (submission.error?.message ?? "")
    const prompt = buildSubmissionReviewPrompt({
      companyName: this.companyName,
      ticketTitle: task.title,
      difficultyLabel: difficultyLabels[task.difficulty],
      requirements: task.requirements,
      referenceSql: task.referenceSql,
      submittedSql: submission.sqlText,
      verdict: submission.verdict,
      gradingSummary,
    })
    try {
      const response = await this.provider.generateStructured({
        purpose: "submission_review",
        system: prompt.system,
        user: prompt.user,
        schema: reviewFeedbackSchema,
        effort: "medium",
        metadata: { submissionId, verdict: submission.verdict },
      })
      await this.db
        .update(tables.taskSubmissions)
        .set({ feedbackStatus: "ready", feedback: response.data })
        .where(eq(tables.taskSubmissions.id, submissionId))
    } catch (error) {
      await this.db
        .update(tables.taskSubmissions)
        .set({ feedbackStatus: "failed" })
        .where(eq(tables.taskSubmissions.id, submissionId))
      throw error
    }
  }
}
