import type {
  QualityCheck,
  QualityOverview,
  QualityRun,
  QualityRunStatus,
  UpsertQualityCheckRequest,
} from "@sequel/contracts"
import { interpolate, qualityMessages } from "@sequel/copy"
import { tables, type Database } from "@sequel/db"
import { SCHEDULER_KEYS, type JobProducer } from "@sequel/queue"
import type { SqlEngine } from "@sequel/sql-engine"
import { and, desc, eq, max } from "drizzle-orm"
import { notFound } from "../../shared/errors"
import type { Logger } from "../../shared/logger"
import { iso, isoOrNull } from "../../shared/time"
import type { JobService } from "../jobs/service"
import { presentError } from "../queries/mapper"
import type { ExecutionRecorder } from "../queries/recorder"
import { assertValidTimezone, nextRun } from "../scheduling/cron"
import type { WarehouseService } from "../warehouse/service"
import { planCheck } from "./sql"

type CheckRow = typeof tables.qualityChecks.$inferSelect
type RunRow = typeof tables.qualityCheckRuns.$inferSelect

const RUN_HISTORY_LIMIT = 50

export type QualitySettings = { snapshotEnd: string; timezone: string }

export class QualityService {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly recorder: ExecutionRecorder,
    private readonly jobs: JobService,
    private readonly producer: JobProducer,
    private readonly settings: QualitySettings,
    private readonly logger: Logger,
  ) {}

  async list(userId: string): Promise<QualityCheck[]> {
    const rows = await this.db
      .select()
      .from(tables.qualityChecks)
      .where(eq(tables.qualityChecks.userId, userId))
      .orderBy(
        tables.qualityChecks.targetSchema,
        tables.qualityChecks.targetTable,
        tables.qualityChecks.name,
      )
    return Promise.all(rows.map((row) => this.present(row)))
  }

  async get(userId: string, id: string): Promise<QualityCheck> {
    return this.present(await this.row(userId, id))
  }

  async create(
    userId: string,
    input: UpsertQualityCheckRequest,
    seedKey: string | null = null,
  ): Promise<QualityCheck> {
    this.validateCron(input.cronExpression)
    const [row] = await this.db
      .insert(tables.qualityChecks)
      .values({ userId, seedKey, ...input, description: input.description ?? null })
      .returning()
    if (!row) {
      throw new Error("Failed to create quality check")
    }
    await this.sync(row)
    return this.present(row)
  }

  async update(
    userId: string,
    id: string,
    input: UpsertQualityCheckRequest,
  ): Promise<QualityCheck> {
    await this.row(userId, id)
    this.validateCron(input.cronExpression)
    const [row] = await this.db
      .update(tables.qualityChecks)
      .set({ ...input, description: input.description ?? null })
      .where(eq(tables.qualityChecks.id, id))
      .returning()
    if (!row) {
      throw notFound()
    }
    await this.sync(row)
    return this.present(row)
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.row(userId, id)
    await this.producer.removeSchedule(
      "quality_check",
      `${SCHEDULER_KEYS.qualityCheckPrefix}${row.id}`,
    )
    await this.db.delete(tables.qualityChecks).where(eq(tables.qualityChecks.id, id))
  }

  async trigger(userId: string, id: string): Promise<string> {
    await this.row(userId, id)
    return this.jobs.enqueue("quality_check", { qualityCheckId: id }, { userId, subjectId: id })
  }

  async runs(userId: string, id: string): Promise<QualityRun[]> {
    await this.row(userId, id)
    const rows = await this.db
      .select()
      .from(tables.qualityCheckRuns)
      .where(eq(tables.qualityCheckRuns.qualityCheckId, id))
      .orderBy(desc(tables.qualityCheckRuns.ranAt))
      .limit(RUN_HISTORY_LIMIT)
    return rows.map(toRun)
  }

  async overview(userId: string): Promise<QualityOverview> {
    const checks = await this.list(userId)
    const [latest] = await this.db
      .select({ at: max(tables.qualityCheckRuns.ranAt) })
      .from(tables.qualityCheckRuns)
      .innerJoin(
        tables.qualityChecks,
        eq(tables.qualityChecks.id, tables.qualityCheckRuns.qualityCheckId),
      )
      .where(eq(tables.qualityChecks.userId, userId))
    return {
      total: checks.length,
      passing: checks.filter((check) => check.lastRun?.status === "pass").length,
      failing: checks.filter((check) => check.lastRun?.status === "fail").length,
      erroring: checks.filter((check) => check.lastRun?.status === "error").length,
      neverRun: checks.filter((check) => !check.lastRun).length,
      lastRunAt: isoOrNull(latest?.at ?? null),
    }
  }

  async execute(id: string): Promise<QualityRunStatus> {
    const check = await this.db.query.qualityChecks.findFirst({
      where: eq(tables.qualityChecks.id, id),
    })
    if (!check) {
      return "error"
    }
    const plan = planCheck(check, this.settings.snapshotEnd)
    if (!plan) {
      await this.saveRun(
        check.id,
        "error",
        null,
        check.kind === "custom_sql" ? qualityMessages.missingSql : qualityMessages.missingColumn,
        null,
        null,
      )
      return "error"
    }
    const outcome = await this.engine.runner.execute({
      sql: plan.sql,
      mode: "read",
      searchPath: await this.warehouse.searchPath(null),
      ownedSchemas: [],
      maxRows: 1,
    })
    const execution = await this.recorder.record({
      userId: check.userId,
      sql: plan.sql,
      mode: "read",
      source: "quality",
      outcome,
    })
    const raw = outcome.result?.rows[0]?.[0]
    const observed = raw === null || raw === undefined ? null : Number(raw)
    if (outcome.status !== "succeeded" || observed === null || Number.isNaN(observed)) {
      const message = interpolate(qualityMessages.errored, {
        message: presentError(outcome.error)?.message ?? String(raw),
      })
      await this.saveRun(check.id, "error", null, message, outcome.durationMs, execution.id)
      return "error"
    }
    const status: QualityRunStatus = plan.passes(observed) ? "pass" : "fail"
    const expectation = interpolate(qualityMessages.expectations[check.kind], {
      column: check.targetColumn ?? "",
      min: check.config.min ?? "",
      max: check.config.max ?? "",
      hours: check.config.maxAgeHours ?? "",
    })
    const message =
      status === "pass"
        ? interpolate(qualityMessages.passed, { value: observed })
        : interpolate(qualityMessages.failed, { value: observed, expectation })
    await this.saveRun(
      check.id,
      status,
      String(observed),
      message,
      outcome.durationMs,
      execution.id,
    )
    return status
  }

  async syncAll(): Promise<void> {
    const rows = await this.db.select().from(tables.qualityChecks)
    for (const row of rows) {
      await this.sync(row)
    }
    this.logger.info({ checks: rows.length }, "quality check schedules synchronised")
  }

  async upsertSeed(
    userId: string,
    seedKey: string,
    input: UpsertQualityCheckRequest,
  ): Promise<string> {
    const existing = await this.db.query.qualityChecks.findFirst({
      where: eq(tables.qualityChecks.seedKey, seedKey),
    })
    if (existing) {
      await this.update(userId, existing.id, input)
      return existing.id
    }
    return (await this.create(userId, input, seedKey)).id
  }

  private validateCron(expression: string | null) {
    if (expression) {
      assertValidTimezone(this.settings.timezone)
      nextRun(expression, this.settings.timezone)
    }
  }

  private async sync(row: CheckRow): Promise<void> {
    const schedulerId = `${SCHEDULER_KEYS.qualityCheckPrefix}${row.id}`
    if (!row.isEnabled || !row.cronExpression) {
      await this.producer.removeSchedule("quality_check", schedulerId)
      return
    }
    await this.producer.upsertSchedule(
      "quality_check",
      { qualityCheckId: row.id },
      { schedulerId, pattern: row.cronExpression, timezone: this.settings.timezone },
    )
  }

  private async saveRun(
    checkId: string,
    status: QualityRunStatus,
    observedValue: string | null,
    message: string,
    durationMs: number | null,
    executionId: string | null,
  ) {
    await this.db
      .insert(tables.qualityCheckRuns)
      .values({ qualityCheckId: checkId, status, observedValue, message, durationMs, executionId })
  }

  private async present(row: CheckRow): Promise<QualityCheck> {
    const last = await this.db.query.qualityCheckRuns.findFirst({
      where: eq(tables.qualityCheckRuns.qualityCheckId, row.id),
      orderBy: desc(tables.qualityCheckRuns.ranAt),
    })
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      kind: row.kind,
      targetSchema: row.targetSchema,
      targetTable: row.targetTable,
      targetColumn: row.targetColumn,
      config: row.config,
      severity: row.severity,
      isEnabled: row.isEnabled,
      cronExpression: row.cronExpression,
      lastRun: last ? toRun(last) : null,
      createdAt: iso(row.createdAt),
    }
  }

  private async row(userId: string, id: string): Promise<CheckRow> {
    const row = await this.db.query.qualityChecks.findFirst({
      where: and(eq(tables.qualityChecks.id, id), eq(tables.qualityChecks.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return row
  }
}

function toRun(row: RunRow): QualityRun {
  return {
    id: row.id,
    status: row.status,
    observedValue: row.observedValue,
    message: row.message,
    durationMs: row.durationMs,
    ranAt: iso(row.ranAt),
  }
}
