import { taskDefinitionSchema, LIMITS, type TaskDefinition, type Topic } from "@sequel/contracts"
import {
  difficultyLabels,
  difficultySeniority,
  jobStageLabels,
  taskTexts,
  topicLabels,
  trackLabels,
} from "@sequel/copy"
import { tables, type Database, type LlmUsage } from "@sequel/db"
import { buildTaskGenerationPrompt, isLlmError, type LlmProvider } from "@sequel/llm"
import { and, desc, eq, ne } from "drizzle-orm"
import type { Logger } from "../../shared/logger"
import type { JobProgressReporter } from "../jobs/service"
import type { ProgressService } from "../progress/service"
import type { IdentityService } from "../identity/service"
import type { DatasetDigestBuilder } from "./digest"
import type { TaskRow } from "./mapper"
import type { TaskTarget } from "./types"
import type { ReferenceValidator } from "./validator"

export type GeneratorSettings = {
  companyName: string
  asOfDate: string
  maxAttempts: number
  referenceMaxRows: number
}

const RECENT_TITLES = 10
const STRONG_LEVEL = 60

export function normaliseDefinition(
  definition: TaskDefinition,
  target: TaskTarget,
): TaskDefinition {
  const topics = [...new Set([...target.topics, ...definition.topics])].slice(
    0,
    LIMITS.topicsPerTaskMax,
  )
  return {
    ...definition,
    track: target.track,
    difficulty: target.difficulty,
    mode: target.mode,
    topics,
    datasetSlugs: [...new Set([target.datasetSlug, ...definition.datasetSlugs])],
    hints: definition.hints
      .map((hint) => hint.trim())
      .filter(Boolean)
      .slice(0, 3),
    verificationSql: target.mode === "scratch" ? definition.verificationSql : null,
    estimatedMinutes: Math.max(1, Math.round(definition.estimatedMinutes)),
  }
}

export function targetOf(row: TaskRow): TaskTarget {
  return {
    track: row.track,
    difficulty: row.difficulty,
    topics: row.topics,
    datasetSlug: row.datasetSlugs[0] ?? "",
    mode: row.mode,
  }
}

export class TaskGenerator {
  constructor(
    private readonly db: Database,
    private readonly provider: LlmProvider,
    private readonly validator: ReferenceValidator,
    private readonly digests: DatasetDigestBuilder,
    private readonly progress: ProgressService,
    private readonly identity: IdentityService,
    private readonly settings: GeneratorSettings,
    private readonly logger: Logger,
  ) {}

  async generate(taskId: string, report: JobProgressReporter): Promise<void> {
    const row = await this.db.query.tasks.findFirst({ where: eq(tables.tasks.id, taskId) })
    if (!row || row.status !== "generating") {
      return
    }
    const target = targetOf(row)
    await report(5, jobStageLabels.planning)
    const [datasets, skills, profile, recent, existing] = await Promise.all([
      this.digests.build([target.datasetSlug]),
      this.progress.skills(row.userId),
      this.identity.profile(row.userId),
      this.db
        .select({ title: tables.tasks.title })
        .from(tables.tasks)
        .where(
          and(
            eq(tables.tasks.userId, row.userId),
            ne(tables.tasks.id, taskId),
            ne(tables.tasks.status, "generating"),
          ),
        )
        .orderBy(desc(tables.tasks.createdAt))
        .limit(RECENT_TITLES),
      this.db
        .select({ title: tables.tasks.title })
        .from(tables.tasks)
        .where(and(eq(tables.tasks.userId, row.userId), ne(tables.tasks.id, taskId))),
    ])
    const levels = (
      Object.entries(skills) as [Topic, { level: number; attempts: number }][]
    ).filter(([, state]) => state.attempts > 0)
    const previousAttempts: { title: string; problem: string }[] = []
    const usage: LlmUsage = {
      model: this.provider.model,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      attempts: 0,
      latencyMs: 0,
    }

    for (let attempt = 1; attempt <= this.settings.maxAttempts; attempt += 1) {
      const base = Math.round(((attempt - 1) / this.settings.maxAttempts) * 80)
      await report(10 + base, attempt === 1 ? jobStageLabels.drafting : jobStageLabels.retrying)
      const prompt = buildTaskGenerationPrompt({
        companyName: this.settings.companyName,
        asOfDate: this.settings.asOfDate,
        maxResultRows: this.settings.referenceMaxRows,
        datasets,
        target: {
          ...target,
          trackLabel: trackLabels[target.track],
          difficultyLabel: difficultyLabels[target.difficulty],
          seniorityLabel: difficultySeniority[target.difficulty],
          topicLabels: target.topics.map((topic) => topicLabels[topic]),
        },
        learner: {
          roleTitle: profile.roleTitle,
          weakTopics: levels
            .filter(([, state]) => state.level < STRONG_LEVEL)
            .map(([topic]) => topicLabels[topic]),
          strongTopics: levels
            .filter(([, state]) => state.level >= STRONG_LEVEL)
            .map(([topic]) => topicLabels[topic]),
          recentTitles: recent.map((item) => item.title),
        },
        previousAttempts,
      })
      try {
        const response = await this.provider.generateStructured({
          purpose: "task_generation",
          system: prompt.system,
          user: prompt.user,
          schema: taskDefinitionSchema,
          metadata: { target, attempt, existingTitles: existing.map((item) => item.title) },
        })
        usage.model = response.model
        usage.inputTokens += response.usage.inputTokens
        usage.outputTokens += response.usage.outputTokens
        usage.cacheReadInputTokens += response.usage.cacheReadInputTokens
        usage.latencyMs += response.latencyMs
        usage.attempts = attempt

        const definition = normaliseDefinition(response.data, target)
        await report(10 + base + 15, jobStageLabels.validating)
        const validation = await this.validator.validate(definition)
        if (!validation.ok) {
          this.logger.warn(
            { taskId, attempt, problem: validation.problem },
            "generated task failed validation",
          )
          previousAttempts.push({ title: definition.title, problem: validation.problem })
          continue
        }
        await report(95, jobStageLabels.publishing)
        await this.publish(
          row,
          { ...definition, expectedColumns: validation.expectedColumns },
          validation.signature,
          usage,
        )
        return
      } catch (error) {
        if (isLlmError(error) && error.retryable && attempt < this.settings.maxAttempts) {
          this.logger.warn({ taskId, attempt, kind: error.kind }, "task generation attempt failed")
          continue
        }
        await this.markFailed(
          taskId,
          isLlmError(error) && error.kind === "not_configured"
            ? taskTexts.generationNotConfigured
            : taskTexts.generationFailed,
          usage,
        )
        throw error
      }
    }
    await this.markFailed(taskId, taskTexts.generationFailed, usage)
    throw new Error(
      previousAttempts.map((attempt) => attempt.problem).join(" | ") || taskTexts.generationFailed,
    )
  }

  private async publish(
    row: TaskRow,
    definition: TaskDefinition,
    signature: NonNullable<TaskRow["referenceSignature"]>,
    usage: LlmUsage,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(tables.tasks)
        .set({
          status: "open",
          title: definition.title,
          topics: definition.topics,
          datasetSlugs: definition.datasetSlugs,
          stakeholder: definition.stakeholder,
          businessContext: definition.businessContext,
          requirements: definition.requirements,
          acceptanceCriteria: definition.acceptanceCriteria,
          expectedColumns: definition.expectedColumns,
          orderMatters: definition.orderMatters,
          referenceSql: definition.referenceSql,
          verificationSql: definition.verificationSql,
          referenceSignature: signature,
          explanation: definition.explanation,
          estimatedMinutes: definition.estimatedMinutes,
          generationError: null,
          llmModel: usage.model,
          llmUsage: usage,
        })
        .where(eq(tables.tasks.id, row.id))
      await tx.delete(tables.taskHints).where(eq(tables.taskHints.taskId, row.id))
      await tx
        .insert(tables.taskHints)
        .values(definition.hints.map((body, position) => ({ taskId: row.id, position, body })))
    })
  }

  private async markFailed(taskId: string, message: string, usage: LlmUsage): Promise<void> {
    await this.db
      .update(tables.tasks)
      .set({ status: "failed_generation", generationError: message, llmUsage: usage })
      .where(eq(tables.tasks.id, taskId))
  }
}
