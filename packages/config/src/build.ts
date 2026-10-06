import type { ApiEnv, CliEnv, CoreEnv, WorkerEnv } from "./schema"

export function buildCoreConfig(env: CoreEnv) {
  return {
    app: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      isProduction: env.NODE_ENV === "production",
    },
    log: { level: env.LOG_LEVEL },
    database: { url: env.DATABASE_URL },
    sandbox: {
      adminUrl: env.SANDBOX_DATABASE_URL,
      readerUrl: env.SANDBOX_READER_DATABASE_URL,
      writerUrl: env.SANDBOX_WRITER_DATABASE_URL,
      statementTimeoutMs: env.SANDBOX_STATEMENT_TIMEOUT_MS,
      lockTimeoutMs: env.SANDBOX_LOCK_TIMEOUT_MS,
      idleTransactionTimeoutMs: env.SANDBOX_IDLE_TRANSACTION_TIMEOUT_MS,
      workMem: env.SANDBOX_WORK_MEM,
      tempFileLimit: env.SANDBOX_TEMP_FILE_LIMIT,
      connectionLimit: env.SANDBOX_CONNECTION_LIMIT,
      maxRows: env.SANDBOX_MAX_ROWS,
      fetchChunk: env.SANDBOX_FETCH_CHUNK,
      maxResultBytes: env.SANDBOX_MAX_RESULT_BYTES,
      maxCellChars: env.SANDBOX_MAX_CELL_CHARS,
      maxStatementsPerRun: env.SANDBOX_MAX_STATEMENTS_PER_RUN,
      poolSize: env.SANDBOX_POOL_SIZE,
      cancelGraceMs: env.SANDBOX_CANCEL_GRACE_MS,
      scratchTtlHours: env.SANDBOX_SCRATCH_TTL_HOURS,
      timezone: env.SANDBOX_TIMEZONE,
    },
    redis: { url: env.REDIS_URL },
    llm: {
      provider: env.LLM_PROVIDER,
      apiKey: env.LLM_API_KEY,
      model: env.LLM_MODEL,
      maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
      effort: env.LLM_EFFORT,
      feedbackEnabled: env.LLM_FEEDBACK_ENABLED,
      timeoutMs: env.LLM_TIMEOUT_MS,
      maxRetries: env.LLM_MAX_RETRIES,
    },
    tasks: {
      generationMaxAttempts: env.TASK_GENERATION_MAX_ATTEMPTS,
      referenceMaxRows: env.TASK_REFERENCE_MAX_ROWS,
      referenceStoreRows: env.TASK_REFERENCE_STORE_ROWS,
      starterDatasetSlug: env.TASK_STARTER_DATASET_SLUG,
      starterTaskCount: env.TASK_STARTER_TASK_COUNT,
      ticketPrefix: env.TASK_TICKET_PREFIX,
    },
    grader: {
      statementTimeoutMs: env.GRADER_STATEMENT_TIMEOUT_MS,
      numericScale: env.GRADER_NUMERIC_SCALE,
      sampleDiffRows: env.GRADER_SAMPLE_DIFF_ROWS,
    },
    cache: {
      schemaTtlSeconds: env.SCHEMA_CACHE_TTL_S,
      dashboardTtlSeconds: env.DASHBOARD_CACHE_TTL_S,
    },
    jobs: {
      retentionCount: env.JOB_RETENTION_COUNT,
      heartbeatIntervalMs: env.WORKER_HEARTBEAT_INTERVAL_MS,
      heartbeatTtlSeconds: env.WORKER_HEARTBEAT_TTL_S,
    },
    localUser: {
      id: env.LOCAL_USER_ID,
      handle: env.LOCAL_USER_HANDLE,
      displayName: env.LOCAL_USER_DISPLAY_NAME,
      roleTitle: env.LOCAL_USER_ROLE_TITLE,
    },
    datasets: {
      seed: env.DATASET_SEED,
      asOfDate: env.DATASET_AS_OF_DATE,
      scale: env.DATASET_SCALE,
      root: env.DATASETS_ROOT ?? null,
    },
  }
}

export function buildApiConfig(env: ApiEnv) {
  return {
    ...buildCoreConfig(env),
    api: {
      host: env.API_HOST,
      port: env.API_PORT,
      basePath: env.API_BASE_PATH,
      corsOrigins: env.API_CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      sseHeartbeatMs: env.API_SSE_HEARTBEAT_MS,
      bodyLimitBytes: env.API_BODY_LIMIT_BYTES,
    },
  }
}

export function buildWorkerConfig(env: WorkerEnv) {
  return {
    ...buildCoreConfig(env),
    worker: {
      concurrency: env.WORKER_CONCURRENCY,
      healthHost: env.WORKER_HEALTH_HOST,
      healthPort: env.WORKER_HEALTH_PORT,
      scratchSweepCron: env.WORKER_SCRATCH_SWEEP_CRON,
      catalogRefreshCron: env.WORKER_CATALOG_REFRESH_CRON,
    },
  }
}

export function buildCliConfig(env: CliEnv) {
  return {
    ...buildCoreConfig(env),
    bootstrap: {
      superuserUrl: env.POSTGRES_SUPERUSER_URL,
      appDatabase: env.POSTGRES_APP_DB,
      sandboxDatabase: env.POSTGRES_SANDBOX_DB,
      roles: {
        app: { name: env.POSTGRES_APP_ROLE, password: env.POSTGRES_APP_PASSWORD },
        sandboxAdmin: {
          name: env.POSTGRES_SANDBOX_ADMIN_ROLE,
          password: env.POSTGRES_SANDBOX_ADMIN_PASSWORD,
        },
        sandboxReader: {
          name: env.POSTGRES_SANDBOX_READER_ROLE,
          password: env.POSTGRES_SANDBOX_READER_PASSWORD,
        },
        sandboxWriter: {
          name: env.POSTGRES_SANDBOX_WRITER_ROLE,
          password: env.POSTGRES_SANDBOX_WRITER_PASSWORD,
        },
      },
    },
  }
}

export type CoreConfig = ReturnType<typeof buildCoreConfig>
export type ApiConfig = ReturnType<typeof buildApiConfig>
export type WorkerConfig = ReturnType<typeof buildWorkerConfig>
export type CliConfig = ReturnType<typeof buildCliConfig>
