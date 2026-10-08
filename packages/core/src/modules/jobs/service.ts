import { randomUUID } from "node:crypto"
import type { JobKind, JobListQuery, JobSnapshot } from "@sequel/contracts"
import { LIMITS } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { jobChannel, type JobPayload, type JobProducer, type Redis } from "@sequel/queue"
import { and, desc, eq, type SQL } from "drizzle-orm"
import { notFound } from "../../shared/errors"
import { toJobSnapshot } from "./mapper"

export type JobContext = { userId: string | null; subjectId: string | null }

export type JobProgressReporter = (progress: number, stage: string) => Promise<void>

export class JobService {
  constructor(
    private readonly db: Database,
    private readonly producer: JobProducer,
    private readonly publisher: Redis,
  ) {}

  async enqueue<K extends JobKind>(
    kind: K,
    payload: JobPayload<K>,
    context: JobContext,
  ): Promise<string> {
    const id = randomUUID()
    await this.db.insert(tables.jobs).values({
      id,
      kind,
      userId: context.userId,
      subjectId: context.subjectId,
      status: "queued",
      stage: null,
    })
    await this.producer.enqueue(kind, payload, { jobId: id })
    await this.publish(id)
    return id
  }

  async get(id: string): Promise<JobSnapshot> {
    const row = await this.db.query.jobs.findFirst({ where: eq(tables.jobs.id, id) })
    if (!row) {
      throw notFound()
    }
    return toJobSnapshot(row)
  }

  async find(id: string): Promise<JobSnapshot | null> {
    const row = await this.db.query.jobs.findFirst({ where: eq(tables.jobs.id, id) })
    return row ? toJobSnapshot(row) : null
  }

  async list(query: JobListQuery): Promise<JobSnapshot[]> {
    const filters: SQL[] = []
    if (query.kind) {
      filters.push(eq(tables.jobs.kind, query.kind))
    }
    if (query.status) {
      filters.push(eq(tables.jobs.status, query.status))
    }
    const rows = await this.db
      .select()
      .from(tables.jobs)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(tables.jobs.createdAt))
      .limit(query.limit ?? LIMITS.pageSizeDefault)
    return rows.map(toJobSnapshot)
  }

  async start(id: string, kind: JobKind, context: JobContext, attempts: number): Promise<void> {
    await this.db
      .insert(tables.jobs)
      .values({
        id,
        kind,
        userId: context.userId,
        subjectId: context.subjectId,
        status: "running",
        progress: 0,
        attempts,
        startedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tables.jobs.id,
        set: { status: "running", attempts, startedAt: new Date(), error: null },
      })
    await this.publish(id)
  }

  reporter(id: string): JobProgressReporter {
    return async (progress, stage) => {
      await this.db.update(tables.jobs).set({ progress, stage }).where(eq(tables.jobs.id, id))
      await this.publish(id)
    }
  }

  async succeed(id: string): Promise<void> {
    await this.db
      .update(tables.jobs)
      .set({ status: "succeeded", progress: 100, finishedAt: new Date() })
      .where(eq(tables.jobs.id, id))
    await this.publish(id)
  }

  async fail(id: string, error: string): Promise<void> {
    await this.db
      .update(tables.jobs)
      .set({ status: "failed", error, finishedAt: new Date() })
      .where(eq(tables.jobs.id, id))
    await this.publish(id)
  }

  private async publish(id: string): Promise<void> {
    const snapshot = await this.find(id)
    if (snapshot) {
      await this.publisher.publish(jobChannel(id), JSON.stringify(snapshot))
    }
  }
}
