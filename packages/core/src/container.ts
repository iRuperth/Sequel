import type { CoreConfig } from "@sequel/config"
import { createDatabase } from "@sequel/db"
import { createLlmProvider, type MockResponder } from "@sequel/llm"
import { JobProducer, createRedis } from "@sequel/queue"
import { SqlEngine } from "@sequel/sql-engine"
import { ActivityService } from "./modules/activity/service"
import { CatalogRefresher } from "./modules/catalog/refresh"
import { CatalogSeeder } from "./modules/catalog/seed"
import { CatalogService } from "./modules/catalog/service"
import { DashboardService } from "./modules/dashboards/service"
import { HealthService } from "./modules/health/service"
import { IdentityService } from "./modules/identity/service"
import { JobEventHub } from "./modules/jobs/events"
import { JobService } from "./modules/jobs/service"
import { ProgressService } from "./modules/progress/service"
import { QualityService } from "./modules/quality/service"
import { ExecutionRecorder } from "./modules/queries/recorder"
import { QueryService } from "./modules/queries/service"
import { SandboxService } from "./modules/sandbox/service"
import { SavedQueryService } from "./modules/saved-queries/service"
import { ScheduledQueryService } from "./modules/scheduling/service"
import { DatasetDigestBuilder } from "./modules/tasks/digest"
import { TaskGenerator } from "./modules/tasks/generator"
import { SubmissionGrader } from "./modules/tasks/grader"
import { TaskPlanner } from "./modules/tasks/planner"
import { SubmissionReviewer } from "./modules/tasks/reviewer"
import { TaskService } from "./modules/tasks/service"
import { StarterTaskImporter } from "./modules/tasks/starter"
import { ReferenceRunner, ReferenceValidator } from "./modules/tasks/validator"
import { WarehouseService } from "./modules/warehouse/service"
import { JsonCache } from "./shared/cache"
import type { Logger } from "./shared/logger"

export type CoreOptions = {
  applicationName: string
  mockResponder: MockResponder
  appPoolSize?: number
}

export function createCore(config: CoreConfig, logger: Logger, options: CoreOptions) {
  const database = createDatabase({
    url: config.database.url,
    applicationName: options.applicationName,
    maxConnections: options.appPoolSize,
  })
  const db = database.db
  const engine = new SqlEngine({
    adminUrl: config.sandbox.adminUrl,
    readerUrl: config.sandbox.readerUrl,
    writerUrl: config.sandbox.writerUrl,
    poolSize: config.sandbox.poolSize,
    applicationName: options.applicationName,
    maxRows: config.sandbox.maxRows,
    maxBytes: config.sandbox.maxResultBytes,
    maxCellChars: config.sandbox.maxCellChars,
    fetchChunk: config.sandbox.fetchChunk,
    statementTimeoutMs: config.sandbox.statementTimeoutMs,
    cancelGraceMs: config.sandbox.cancelGraceMs,
    maxStatementsPerRun: config.sandbox.maxStatementsPerRun,
  })
  const redis = createRedis(config.redis.url, "client")
  const bullConnection = createRedis(config.redis.url, "bullmq")
  const producer = new JobProducer(bullConnection, config.jobs.retentionCount)
  const cache = new JsonCache(redis)
  const provider = createLlmProvider(config.llm, options.mockResponder)

  const identity = new IdentityService(db, config.localUser)
  const activity = new ActivityService(db)
  const jobs = new JobService(db, producer, redis)
  const warehouse = new WarehouseService(db, engine, cache, config.cache.schemaTtlSeconds)
  const sandbox = new SandboxService(
    db,
    engine,
    config.sandbox.scratchTtlHours,
    logger.child({ module: "sandbox" }),
  )
  const recorder = new ExecutionRecorder(db)
  const queries = new QueryService(db, engine, warehouse, sandbox, recorder, activity)
  const savedQueries = new SavedQueryService(db)
  const catalog = new CatalogService(db)
  const catalogSeeder = new CatalogSeeder(db)
  const catalogRefresher = new CatalogRefresher(
    db,
    engine,
    warehouse,
    logger.child({ module: "catalog" }),
  )
  const progress = new ProgressService(db, identity)
  const planner = new TaskPlanner(db, identity, progress, warehouse, {
    starterDatasetSlug: config.tasks.starterDatasetSlug,
    starterTaskCount: config.tasks.starterTaskCount,
  })
  const referenceRunner = new ReferenceRunner(
    engine,
    warehouse,
    sandbox,
    config.grader.statementTimeoutMs,
  )
  const validator = new ReferenceValidator(referenceRunner, {
    referenceMaxRows: config.tasks.referenceMaxRows,
    referenceStoreRows: config.tasks.referenceStoreRows,
    numericScale: config.grader.numericScale,
    statementTimeoutMs: config.grader.statementTimeoutMs,
  })
  const digests = new DatasetDigestBuilder(db)
  const generator = new TaskGenerator(
    db,
    provider,
    validator,
    digests,
    progress,
    identity,
    {
      companyName: config.app.name,
      asOfDate: config.datasets.asOfDate,
      maxAttempts: config.tasks.generationMaxAttempts,
      referenceMaxRows: config.tasks.referenceMaxRows,
    },
    logger.child({ module: "task-generator" }),
  )
  const grader = new SubmissionGrader(db, referenceRunner, recorder, progress, activity, {
    numericScale: config.grader.numericScale,
    sampleSize: config.grader.sampleDiffRows,
    maxRows: config.sandbox.maxRows,
  })
  const reviewer = new SubmissionReviewer(db, provider, config.app.name)
  const tasks = new TaskService(db, planner, jobs, provider, config.tasks.ticketPrefix)
  const starterImporter = new StarterTaskImporter(
    db,
    validator,
    logger.child({ module: "starter-import" }),
  )
  const dashboards = new DashboardService(
    db,
    engine,
    warehouse,
    sandbox,
    recorder,
    cache,
    config.cache.dashboardTtlSeconds,
    config.sandbox.maxRows,
  )
  const scheduledQueries = new ScheduledQueryService(
    db,
    engine,
    warehouse,
    savedQueries,
    recorder,
    jobs,
    producer,
    config.sandbox.maxRows,
    logger.child({ module: "scheduling" }),
  )
  const quality = new QualityService(
    db,
    engine,
    warehouse,
    recorder,
    jobs,
    producer,
    { snapshotEnd: `${config.datasets.asOfDate}T23:59:59Z`, timezone: config.sandbox.timezone },
    logger.child({ module: "quality" }),
  )
  const health = new HealthService(database, engine, redis, provider, {
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    feedbackEnabled: config.llm.feedbackEnabled,
    heartbeatTtlSeconds: config.jobs.heartbeatTtlSeconds,
  })

  return {
    config,
    database,
    engine,
    redis,
    bullConnection,
    producer,
    provider,
    identity,
    activity,
    jobs,
    warehouse,
    sandbox,
    queries,
    savedQueries,
    catalog,
    catalogSeeder,
    catalogRefresher,
    progress,
    tasks,
    generator,
    grader,
    reviewer,
    starterImporter,
    dashboards,
    scheduledQueries,
    quality,
    health,
    async ready() {
      await engine.ready()
    },
    async close() {
      await producer.close()
      await Promise.allSettled([engine.close(), database.close()])
      redis.disconnect()
      bullConnection.disconnect()
    },
  }
}

export type Core = ReturnType<typeof createCore>

export function createJobEventHub(redisUrl: string): JobEventHub {
  return new JobEventHub(createRedis(redisUrl, "subscriber"))
}
