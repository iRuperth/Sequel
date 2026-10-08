import type { Comparison, Verdict } from "@sequel/contracts"
import { jobStageLabels } from "@sequel/copy"
import { tables, type Database } from "@sequel/db"
import { gradeResults } from "@sequel/sql-engine"
import { eq } from "drizzle-orm"
import type { JobProgressReporter } from "../jobs/service"
import type { ActivityService } from "../activity/service"
import type { ProgressService } from "../progress/service"
import { presentError } from "../queries/mapper"
import type { ExecutionRecorder } from "../queries/recorder"
import type { ReferenceRunner } from "./validator"

export type GraderSettings = { numericScale: number; sampleSize: number; maxRows: number }

export class SubmissionGrader {
  constructor(
    private readonly db: Database,
    private readonly runner: ReferenceRunner,
    private readonly recorder: ExecutionRecorder,
    private readonly progress: ProgressService,
    private readonly activity: ActivityService,
    private readonly settings: GraderSettings,
  ) {}

  async grade(submissionId: string, report: JobProgressReporter): Promise<Verdict> {
    const submission = await this.db.query.taskSubmissions.findFirst({
      where: eq(tables.taskSubmissions.id, submissionId),
    })
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`)
    }
    const task = await this.db.query.tasks.findFirst({
      where: eq(tables.tasks.id, submission.taskId),
    })
    if (!task || !task.referenceSql) {
      throw new Error(`Task ${submission.taskId} has no reference solution`)
    }

    await report(15, jobStageLabels.gradingSubmission)
    const actual = await this.runner.run(task, submission.sqlText, this.settings.maxRows)
    const execution = await this.recorder.record({
      userId: submission.userId,
      sql: submission.sqlText,
      mode: task.mode === "scratch" ? "scratch" : "grade",
      source: "task",
      outcome: actual,
      taskId: task.id,
    })

    let verdict: Verdict
    let comparison: Comparison | null = null
    if (actual.status === "rejected") {
      verdict = "rejected"
    } else if (actual.status !== "succeeded" || !actual.result) {
      verdict = "error"
    } else {
      await report(50, jobStageLabels.gradingReference)
      const expected = await this.runner.run(task, task.referenceSql, this.settings.maxRows)
      if (expected.status !== "succeeded" || !expected.result) {
        throw new Error(
          `Reference solution failed for task ${task.id}: ${expected.error?.message ?? expected.status}`,
        )
      }
      await report(80, jobStageLabels.comparing)
      const gradeReport = gradeResults(expected.result, actual.result, {
        orderMatters: task.orderMatters,
        numericScale: this.settings.numericScale,
        sampleSize: this.settings.sampleSize,
      })
      const { passed, ...rest } = gradeReport
      comparison = rest
      verdict = passed ? "pass" : "fail"
    }

    const newlySolved = verdict === "pass" && task.status !== "solved"
    await this.db
      .update(tables.taskSubmissions)
      .set({
        status: "graded",
        verdict,
        comparison,
        error: presentError(actual.error),
        durationMs: actual.durationMs,
        executionId: execution.id,
        gradedAt: new Date(),
      })
      .where(eq(tables.taskSubmissions.id, submissionId))

    if (newlySolved) {
      await this.db
        .update(tables.tasks)
        .set({ status: "solved", solvedAt: new Date() })
        .where(eq(tables.tasks.id, task.id))
    } else if (task.status === "open") {
      await this.db
        .update(tables.tasks)
        .set({ status: "in_progress" })
        .where(eq(tables.tasks.id, task.id))
    }
    if (
      task.status !== "solved" &&
      task.status !== "abandoned" &&
      (verdict === "pass" || verdict === "fail")
    ) {
      await this.progress.recordGrade(
        submission.userId,
        task.topics,
        task.difficulty,
        verdict === "pass",
      )
    }
    await this.activity.record(submission.userId, {
      tasksAttempted: 1,
      tasksSolved: newlySolved ? 1 : 0,
    })
    return verdict
  }
}
