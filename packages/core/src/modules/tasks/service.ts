import type {
  GenerateTaskRequest,
  GenerateTaskResponse,
  Submission,
  SubmitTaskResponse,
  TaskDetail,
  TaskHint,
  TaskListQuery,
  TaskPage,
  TaskStatus,
} from "@sequel/contracts"
import { LIMITS, TASK_STATUSES } from "@sequel/contracts"
import { taskTexts } from "@sequel/copy"
import { tables, type Database } from "@sequel/db"
import type { LlmProvider } from "@sequel/llm"
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm"
import { decodeCursor, encodeCursor } from "../../shared/cursor"
import { AppError, conflict, notFound } from "../../shared/errors"
import type { JobService } from "../jobs/service"
import { toHint, toSubmission, toTaskDetail, toTaskSummary, type TaskRow } from "./mapper"
import type { TaskPlanner } from "./planner"

const GRADABLE: readonly TaskStatus[] = ["open", "in_progress", "solved", "abandoned"]

export class TaskService {
  constructor(
    private readonly db: Database,
    private readonly planner: TaskPlanner,
    private readonly jobs: JobService,
    private readonly provider: LlmProvider,
    private readonly ticketPrefix: string,
  ) {}

  async list(userId: string, query: TaskListQuery): Promise<TaskPage> {
    const limit = query.limit ?? LIMITS.pageSizeDefault
    const filters: SQL[] = [eq(tables.tasks.userId, userId)]
    if (query.status) {
      filters.push(eq(tables.tasks.status, query.status))
    }
    if (query.difficulty) {
      filters.push(eq(tables.tasks.difficulty, query.difficulty))
    }
    if (query.track) {
      filters.push(eq(tables.tasks.track, query.track))
    }
    if (query.datasetSlug) {
      filters.push(arrayContains(tables.tasks.datasetSlugs, [query.datasetSlug]))
    }
    if (query.search) {
      filters.push(ilike(tables.tasks.title, `%${query.search}%`))
    }
    const cursor = decodeCursor(query.cursor)
    if (cursor) {
      const before = or(
        lt(tables.tasks.createdAt, cursor.at),
        and(eq(tables.tasks.createdAt, cursor.at), lt(tables.tasks.id, cursor.id)),
      )
      if (before) {
        filters.push(before)
      }
    }
    const rows = await this.db
      .select()
      .from(tables.tasks)
      .where(and(...filters))
      .orderBy(desc(tables.tasks.createdAt), desc(tables.tasks.id))
      .limit(limit + 1)
    const page = rows.slice(0, limit)
    const [attempts, counts] = await Promise.all([
      this.attemptCounts(page.map((row) => row.id)),
      this.statusCounts(userId),
    ])
    const last = page.at(-1)
    return {
      items: page.map((row) => toTaskSummary(row, this.ticketPrefix, attempts.get(row.id) ?? 0)),
      nextCursor:
        rows.length > limit && last ? encodeCursor({ at: last.createdAt, id: last.id }) : null,
      counts,
    }
  }

  async detail(userId: string, id: string): Promise<TaskDetail> {
    const row = await this.row(userId, id)
    const [hints, latest, attempts, job] = await Promise.all([
      this.db
        .select()
        .from(tables.taskHints)
        .where(eq(tables.taskHints.taskId, id))
        .orderBy(asc(tables.taskHints.position)),
      this.db.query.taskSubmissions.findFirst({
        where: eq(tables.taskSubmissions.taskId, id),
        orderBy: desc(tables.taskSubmissions.submittedAt),
      }),
      this.attemptCounts([id]),
      row.generationJobId ? this.jobs.find(row.generationJobId) : Promise.resolve(null),
    ])
    return toTaskDetail({
      row,
      prefix: this.ticketPrefix,
      attempts: attempts.get(id) ?? 0,
      hints,
      latestSubmission: latest ?? null,
      generation: job
        ? { jobId: job.id, status: job.status, error: row.generationError ?? job.error }
        : null,
    })
  }

  async requestGeneration(
    userId: string,
    request: GenerateTaskRequest,
  ): Promise<GenerateTaskResponse> {
    this.assertProviderReady()
    const target = await this.planner.resolve(userId, request)
    const [row] = await this.db
      .insert(tables.tasks)
      .values({
        userId,
        source: "generated",
        status: "generating",
        track: target.track,
        difficulty: target.difficulty,
        topics: target.topics,
        datasetSlugs: [target.datasetSlug],
        mode: target.mode,
        title: taskTexts.generatingTitle,
      })
      .returning()
    if (!row) {
      throw new Error("Failed to create task")
    }
    const jobId = await this.enqueueGeneration(row)
    return { taskId: row.id, jobId }
  }

  async retry(userId: string, id: string): Promise<GenerateTaskResponse> {
    this.assertProviderReady()
    const row = await this.row(userId, id)
    if (row.status !== "failed_generation") {
      throw conflict()
    }
    await this.db
      .update(tables.tasks)
      .set({ status: "generating", generationError: null })
      .where(eq(tables.tasks.id, id))
    const jobId = await this.enqueueGeneration(row)
    return { taskId: id, jobId }
  }

  async saveDraft(userId: string, id: string, sql: string): Promise<void> {
    const row = await this.row(userId, id)
    await this.db
      .update(tables.tasks)
      .set({
        draftSql: sql,
        ...(row.status === "open" && sql.trim() ? { status: "in_progress" as const } : {}),
      })
      .where(eq(tables.tasks.id, id))
  }

  async revealHint(userId: string, id: string, position: number): Promise<TaskHint> {
    await this.row(userId, id)
    const [hint] = await this.db
      .update(tables.taskHints)
      .set({ revealedAt: new Date() })
      .where(
        and(
          eq(tables.taskHints.taskId, id),
          eq(tables.taskHints.position, position),
          isNull(tables.taskHints.revealedAt),
        ),
      )
      .returning()
    const row =
      hint ??
      (await this.db.query.taskHints.findFirst({
        where: and(eq(tables.taskHints.taskId, id), eq(tables.taskHints.position, position)),
      }))
    if (!row) {
      throw notFound()
    }
    return toHint(row)
  }

  async abandon(userId: string, id: string): Promise<TaskDetail> {
    const row = await this.row(userId, id)
    if (!GRADABLE.includes(row.status) || row.status === "solved") {
      throw conflict()
    }
    await this.db.update(tables.tasks).set({ status: "abandoned" }).where(eq(tables.tasks.id, id))
    return this.detail(userId, id)
  }

  async submit(userId: string, id: string, sql: string): Promise<SubmitTaskResponse> {
    const row = await this.row(userId, id)
    if (!GRADABLE.includes(row.status)) {
      throw conflict()
    }
    const [submission] = await this.db
      .insert(tables.taskSubmissions)
      .values({ taskId: id, userId, sqlText: sql, status: "pending" })
      .returning()
    if (!submission) {
      throw new Error("Failed to create submission")
    }
    const jobId = await this.jobs.enqueue(
      "task_grade",
      { submissionId: submission.id },
      { userId, subjectId: submission.id },
    )
    await this.db
      .update(tables.taskSubmissions)
      .set({ jobId })
      .where(eq(tables.taskSubmissions.id, submission.id))
    await this.db.update(tables.tasks).set({ draftSql: sql }).where(eq(tables.tasks.id, id))
    return { submissionId: submission.id, jobId }
  }

  async submissions(userId: string, id: string): Promise<Submission[]> {
    await this.row(userId, id)
    const rows = await this.db
      .select()
      .from(tables.taskSubmissions)
      .where(eq(tables.taskSubmissions.taskId, id))
      .orderBy(desc(tables.taskSubmissions.submittedAt))
    return rows.map(toSubmission)
  }

  async requestFeedback(
    userId: string,
    id: string,
    submissionId: string,
  ): Promise<{ jobId: string }> {
    this.assertProviderReady()
    await this.row(userId, id)
    const submission = await this.db.query.taskSubmissions.findFirst({
      where: and(
        eq(tables.taskSubmissions.id, submissionId),
        eq(tables.taskSubmissions.taskId, id),
      ),
    })
    if (!submission) {
      throw notFound()
    }
    if (submission.status !== "graded" || submission.feedbackStatus === "queued") {
      throw conflict()
    }
    await this.db
      .update(tables.taskSubmissions)
      .set({ feedbackStatus: "queued" })
      .where(eq(tables.taskSubmissions.id, submissionId))
    const jobId = await this.jobs.enqueue(
      "submission_feedback",
      { submissionId },
      { userId, subjectId: submissionId },
    )
    return { jobId }
  }

  private assertProviderReady() {
    if (!this.provider.isConfigured()) {
      throw new AppError("llm_not_configured", taskTexts.generationNotConfigured)
    }
  }

  private async enqueueGeneration(row: TaskRow): Promise<string> {
    const jobId = await this.jobs.enqueue(
      "task_generate",
      { taskId: row.id, userId: row.userId },
      {
        userId: row.userId,
        subjectId: row.id,
      },
    )
    await this.db
      .update(tables.tasks)
      .set({ generationJobId: jobId })
      .where(eq(tables.tasks.id, row.id))
    return jobId
  }

  private async row(userId: string, id: string): Promise<TaskRow> {
    const row = await this.db.query.tasks.findFirst({
      where: and(eq(tables.tasks.id, id), eq(tables.tasks.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return row
  }

  private async attemptCounts(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) {
      return new Map()
    }
    const rows = await this.db
      .select({ taskId: tables.taskSubmissions.taskId, total: count() })
      .from(tables.taskSubmissions)
      .where(inArray(tables.taskSubmissions.taskId, ids))
      .groupBy(tables.taskSubmissions.taskId)
    return new Map(rows.map((row) => [row.taskId, row.total]))
  }

  private async statusCounts(userId: string): Promise<Record<TaskStatus, number>> {
    const rows = await this.db
      .select({ status: tables.tasks.status, total: count() })
      .from(tables.tasks)
      .where(eq(tables.tasks.userId, userId))
      .groupBy(tables.tasks.status)
    const counts = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<
      TaskStatus,
      number
    >
    for (const row of rows) {
      counts[row.status] = row.total
    }
    return counts
  }
}
