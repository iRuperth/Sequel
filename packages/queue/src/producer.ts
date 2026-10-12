import type { JobKind } from "@sequel/contracts"
import { Queue, type JobsOptions } from "bullmq"
import type { Redis } from "ioredis"
import { QUEUE_FOR_JOB, QUEUE_NAMES, type QueueKey } from "./names"
import { jobPayloadSchemas, type JobPayload } from "./payloads"

export type EnqueueOptions = {
  jobId: string
  attempts?: number
  delayMs?: number
}

export type RepeatSpec = {
  schedulerId: string
  pattern: string
  timezone: string
}

export class JobProducer {
  private readonly queues: Record<QueueKey, Queue>

  constructor(
    connection: Redis,
    private readonly retentionCount: number,
  ) {
    this.queues = {
      tasks: new Queue(QUEUE_NAMES.tasks, { connection }),
      grading: new Queue(QUEUE_NAMES.grading, { connection }),
      operations: new Queue(QUEUE_NAMES.operations, { connection }),
    }
  }

  async enqueue<K extends JobKind>(kind: K, payload: JobPayload<K>, options: EnqueueOptions) {
    const data = jobPayloadSchemas[kind].parse(payload)
    const jobOptions: JobsOptions = {
      jobId: options.jobId,
      attempts: options.attempts ?? 1,
      delay: options.delayMs,
      removeOnComplete: this.retentionCount,
      removeOnFail: this.retentionCount,
    }
    await this.queueFor(kind).add(kind, data, jobOptions)
  }

  async upsertSchedule<K extends JobKind>(kind: K, payload: JobPayload<K>, spec: RepeatSpec) {
    const data = jobPayloadSchemas[kind].parse(payload)
    await this.queueFor(kind).upsertJobScheduler(
      spec.schedulerId,
      { pattern: spec.pattern, tz: spec.timezone },
      {
        name: kind,
        data,
        opts: { removeOnComplete: this.retentionCount, removeOnFail: this.retentionCount },
      },
    )
  }

  async removeSchedule(kind: JobKind, schedulerId: string) {
    await this.queueFor(kind).removeJobScheduler(schedulerId)
  }

  async ping(): Promise<void> {
    await this.queues.tasks.getJobCounts("waiting")
  }

  async close() {
    await Promise.all(Object.values(this.queues).map((queue) => queue.close()))
  }

  private queueFor(kind: JobKind): Queue {
    return this.queues[QUEUE_FOR_JOB[kind]]
  }
}
