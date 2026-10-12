import type { LlmStatus, PlatformStatus, ServiceName, ServiceStatus } from "@sequel/contracts"
import type { DatabaseHandle } from "@sequel/db"
import type { LlmProvider } from "@sequel/llm"
import { REDIS_KEYS, type Redis } from "@sequel/queue"
import type { SqlEngine } from "@sequel/sql-engine"

export type HealthSettings = {
  name: string
  version: string
  environment: string
  feedbackEnabled: boolean
  heartbeatTtlSeconds: number
}

const startedAt = Date.now()

export class HealthService {
  constructor(
    private readonly database: DatabaseHandle,
    private readonly engine: SqlEngine,
    private readonly redis: Redis,
    private readonly provider: LlmProvider,
    private readonly settings: HealthSettings,
  ) {}

  async status(): Promise<PlatformStatus> {
    const services = await Promise.all([
      this.probe("app_database", async () => {
        await this.database.pool.query("SELECT 1")
      }),
      this.probe("sandbox_database", () => this.engine.ping()),
      this.probe("redis", async () => {
        await this.redis.ping()
      }),
      this.worker(),
      Promise.resolve(this.llm()),
    ])
    return {
      name: this.settings.name,
      version: this.settings.version,
      environment: this.settings.environment,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      checkedAt: new Date().toISOString(),
      services,
    }
  }

  llmStatus(): LlmStatus {
    return {
      provider: this.provider.name,
      model: this.provider.model,
      configured: this.provider.isConfigured(),
      feedbackEnabled: this.settings.feedbackEnabled,
    }
  }

  private llm(): ServiceStatus {
    const configured = this.provider.isConfigured()
    return {
      name: "llm",
      state: configured ? "operational" : "not_configured",
      latencyMs: null,
      detail: `${this.provider.name} / ${this.provider.model}`,
    }
  }

  private async worker(): Promise<ServiceStatus> {
    const started = performance.now()
    try {
      const value = await this.redis.get(REDIS_KEYS.workerHeartbeat)
      const age = value ? Date.now() - Number(value) : null
      const healthy = age !== null && age < this.settings.heartbeatTtlSeconds * 1000
      return {
        name: "worker",
        state: healthy ? "operational" : "down",
        latencyMs: Math.round(performance.now() - started),
        detail: value ? new Date(Number(value)).toISOString() : null,
      }
    } catch (error) {
      return { name: "worker", state: "down", latencyMs: null, detail: errorMessage(error) }
    }
  }

  private async probe(name: ServiceName, check: () => Promise<void>): Promise<ServiceStatus> {
    const started = performance.now()
    try {
      await check()
      return {
        name,
        state: "operational",
        latencyMs: Math.round(performance.now() - started),
        detail: null,
      }
    } catch (error) {
      return { name, state: "down", latencyMs: null, detail: errorMessage(error) }
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
