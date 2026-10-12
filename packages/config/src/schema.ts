import { z } from "zod"
import {
  booleanFlag,
  isoDate,
  nonEmpty,
  nonNegativeInt,
  port,
  positiveInt,
  url,
} from "./primitives"

export const NODE_ENVIRONMENTS = ["development", "test", "production"] as const
export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const
export const LLM_PROVIDERS = ["anthropic", "mock"] as const
export const LLM_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVIRONMENTS),
  LOG_LEVEL: z.enum(LOG_LEVELS),
  APP_NAME: nonEmpty,
  APP_VERSION: nonEmpty,
  DATABASE_URL: url,
  SANDBOX_DATABASE_URL: url,
  SANDBOX_READER_DATABASE_URL: url,
  SANDBOX_WRITER_DATABASE_URL: url,
  SANDBOX_STATEMENT_TIMEOUT_MS: positiveInt,
  SANDBOX_LOCK_TIMEOUT_MS: positiveInt,
  SANDBOX_IDLE_TRANSACTION_TIMEOUT_MS: positiveInt,
  SANDBOX_WORK_MEM: nonEmpty,
  SANDBOX_TEMP_FILE_LIMIT: nonEmpty,
  SANDBOX_CONNECTION_LIMIT: positiveInt,
  SANDBOX_MAX_ROWS: positiveInt,
  SANDBOX_FETCH_CHUNK: positiveInt,
  SANDBOX_MAX_RESULT_BYTES: positiveInt,
  SANDBOX_MAX_CELL_CHARS: positiveInt,
  SANDBOX_MAX_STATEMENTS_PER_RUN: positiveInt,
  SANDBOX_POOL_SIZE: positiveInt,
  SANDBOX_CANCEL_GRACE_MS: nonNegativeInt,
  SANDBOX_SCRATCH_TTL_HOURS: positiveInt,
  SANDBOX_TIMEZONE: nonEmpty,
  REDIS_URL: url,
  LLM_PROVIDER: z.enum(LLM_PROVIDERS),
  LLM_API_KEY: z.string().default(""),
  LLM_MODEL: nonEmpty,
  LLM_MAX_OUTPUT_TOKENS: positiveInt,
  LLM_EFFORT: z.enum(LLM_EFFORTS),
  LLM_FEEDBACK_ENABLED: booleanFlag,
  LLM_TIMEOUT_MS: positiveInt,
  LLM_MAX_RETRIES: nonNegativeInt,
  TASK_GENERATION_MAX_ATTEMPTS: positiveInt,
  TASK_REFERENCE_MAX_ROWS: positiveInt,
  TASK_REFERENCE_STORE_ROWS: positiveInt,
  TASK_STARTER_DATASET_SLUG: nonEmpty,
  TASK_STARTER_TASK_COUNT: nonNegativeInt,
  TASK_TICKET_PREFIX: nonEmpty,
  GRADER_STATEMENT_TIMEOUT_MS: positiveInt,
  GRADER_NUMERIC_SCALE: nonNegativeInt,
  GRADER_SAMPLE_DIFF_ROWS: positiveInt,
  SCHEMA_CACHE_TTL_S: positiveInt,
  DASHBOARD_CACHE_TTL_S: positiveInt,
  JOB_RETENTION_COUNT: positiveInt,
  WORKER_HEARTBEAT_INTERVAL_MS: positiveInt,
  WORKER_HEARTBEAT_TTL_S: positiveInt,
  LOCAL_USER_ID: z.string().uuid(),
  LOCAL_USER_HANDLE: nonEmpty,
  LOCAL_USER_DISPLAY_NAME: nonEmpty,
  LOCAL_USER_ROLE_TITLE: nonEmpty,
  DATASET_SEED: nonNegativeInt,
  DATASET_AS_OF_DATE: isoDate,
  DATASET_SCALE: z.coerce.number().positive(),
  DATASETS_ROOT: z.string().optional(),
})

export const apiEnvSchema = coreEnvSchema.extend({
  API_HOST: nonEmpty,
  API_PORT: port,
  API_BASE_PATH: nonEmpty,
  API_CORS_ORIGINS: z.string().default(""),
  API_SSE_HEARTBEAT_MS: positiveInt,
  API_BODY_LIMIT_BYTES: positiveInt,
})

export const workerEnvSchema = coreEnvSchema.extend({
  WORKER_CONCURRENCY: positiveInt,
  WORKER_HEALTH_HOST: nonEmpty,
  WORKER_HEALTH_PORT: port,
  WORKER_SCRATCH_SWEEP_CRON: nonEmpty,
  WORKER_CATALOG_REFRESH_CRON: nonEmpty,
})

export const cliEnvSchema = coreEnvSchema.extend({
  POSTGRES_SUPERUSER_URL: url,
  POSTGRES_APP_DB: nonEmpty,
  POSTGRES_SANDBOX_DB: nonEmpty,
  POSTGRES_APP_ROLE: nonEmpty,
  POSTGRES_APP_PASSWORD: nonEmpty,
  POSTGRES_SANDBOX_ADMIN_ROLE: nonEmpty,
  POSTGRES_SANDBOX_ADMIN_PASSWORD: nonEmpty,
  POSTGRES_SANDBOX_READER_ROLE: nonEmpty,
  POSTGRES_SANDBOX_READER_PASSWORD: nonEmpty,
  POSTGRES_SANDBOX_WRITER_ROLE: nonEmpty,
  POSTGRES_SANDBOX_WRITER_PASSWORD: nonEmpty,
})

export const webServerEnvSchema = z.object({
  API_URL: url,
  API_BASE_PATH: nonEmpty,
})

export type CoreEnv = z.infer<typeof coreEnvSchema>
export type ApiEnv = z.infer<typeof apiEnvSchema>
export type WorkerEnv = z.infer<typeof workerEnvSchema>
export type CliEnv = z.infer<typeof cliEnvSchema>
export type WebServerEnv = z.infer<typeof webServerEnvSchema>
export type LlmProviderName = (typeof LLM_PROVIDERS)[number]
export type LlmEffort = (typeof LLM_EFFORTS)[number]
