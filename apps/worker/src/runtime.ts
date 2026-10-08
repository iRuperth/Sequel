import { createServer, type Server } from "node:http"
import { JOB_KINDS, type JobKind } from "@sequel/contracts"
import type { Core, JobProgressReporter, Logger } from "@sequel/core"
import {
  QUEUE_NAMES,
  REDIS_KEYS,
  SCHEDULER_KEYS,
  Worker,
  createRedis,
  jobPayloadSchemas,
  type Job,
} from "@sequel/queue"
import type { WorkerConfig } from "@sequel/config"
import { processors, subjectOf, userOf } from "./processors"

const HEALTH_PATH = "/health"

function isJobKind(value: string): value is JobKind {
  return (JOB_KINDS as readonly string[]).includes(value)
}

export class WorkerRuntime {
  private readonly workers: Worker[] = []
  private heartbeat: NodeJS.Timeout | undefined
  private server: Server | undefined

  constructor(
    private readonly core: Core,
    private readonly config: WorkerConfig,
    private readonly logger: Logger,
  ) {}

  async start(): Promise<void> {
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const worker = new Worker(queueName, (job) => this.process(job), {
        connection: createRedis(this.config.redis.url, "bullmq"),
        concurrency: this.config.worker.concurrency,
      })
      worker.on("error", (error) =>
        this.logger.error({ err: error, queue: queueName }, "worker error"),
      )
      this.workers.push(worker)
    }
    await this.registerMaintenance()
    await this.core.scheduledQueries.syncAll()
    await this.core.quality.syncAll()
    await this.beat()
    this.heartbeat = setInterval(() => void this.beat(), this.config.jobs.heartbeatIntervalMs)
    this.server = createServer((request, response) => {
      const healthy = request.url === HEALTH_PATH
      response.writeHead(healthy ? 200 : 404, { "Content-Type": "application/json" })
      response.end(
        JSON.stringify({
          status: healthy ? "ok" : "not_found",
          queues: Object.values(QUEUE_NAMES),
        }),
      )
    })
    this.server.listen(this.config.worker.healthPort, this.config.worker.healthHost)
    this.logger.info(
      { queues: Object.values(QUEUE_NAMES), port: this.config.worker.healthPort },
      "worker started",
    )
  }

  async stop(): Promise<void> {
    clearInterval(this.heartbeat)
    this.server?.close()
    await Promise.all(this.workers.map((worker) => worker.close()))
    await this.core.redis.del(REDIS_KEYS.workerHeartbeat)
  }

  private async process(job: Job): Promise<void> {
    if (!isJobKind(job.name)) {
      throw new Error(`Unknown job kind ${job.name}`)
    }
    const kind = job.name
    const id = job.id ?? `${kind}:${Date.now()}`
    const payload = jobPayloadSchemas[kind].parse(job.data)
    const log = this.logger.child({ jobId: id, kind })
    await this.core.jobs.start(
      id,
      kind,
      { userId: userOf(job.data), subjectId: subjectOf(kind, job.data) },
      job.attemptsMade + 1,
    )
    const report = this.core.jobs.reporter(id)
    try {
      const handler = processors[kind] as (
        payload: unknown,
        reporter: JobProgressReporter,
        context: { core: Core },
      ) => Promise<void>
      await handler(payload, report, { core: this.core })
      await this.core.jobs.succeed(id)
      log.info("job succeeded")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.core.jobs.fail(id, message)
      log.error({ err: error }, "job failed")
      throw error
    }
  }

  private async registerMaintenance(): Promise<void> {
    const timezone = this.config.sandbox.timezone
    await this.core.producer.upsertSchedule(
      "scratch_sweep",
      {},
      {
        schedulerId: SCHEDULER_KEYS.scratchSweep,
        pattern: this.config.worker.scratchSweepCron,
        timezone,
      },
    )
    await this.core.producer.upsertSchedule(
      "catalog_refresh",
      {},
      {
        schedulerId: SCHEDULER_KEYS.catalogRefresh,
        pattern: this.config.worker.catalogRefreshCron,
        timezone,
      },
    )
  }

  private async beat(): Promise<void> {
    await this.core.redis.set(
      REDIS_KEYS.workerHeartbeat,
      String(Date.now()),
      "EX",
      this.config.jobs.heartbeatTtlSeconds,
    )
  }
}
