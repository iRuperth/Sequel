import { tables, type Database } from "@sequel/db"
import type { MockResponder } from "@sequel/llm"
import { and, eq } from "drizzle-orm"
import type { Logger } from "../../shared/logger"
import type { TaskTarget, StarterExercise } from "./types"
import type { ReferenceValidator } from "./validator"

const STARTER_ORDER_SPACING_MS = 1000

export class StarterTaskImporter {
  constructor(
    private readonly db: Database,
    private readonly validator: ReferenceValidator,
    private readonly logger: Logger,
  ) {}

  async import(
    userId: string,
    exercises: readonly StarterExercise[],
  ): Promise<{ imported: number; skipped: number; invalid: string[] }> {
    let imported = 0
    let skipped = 0
    const invalid: string[] = []
    const batchStartedAt = Date.now()
    for (const [index, exercise] of exercises.entries()) {
      const existing = await this.db.query.tasks.findFirst({
        where: and(eq(tables.tasks.userId, userId), eq(tables.tasks.starterKey, exercise.key)),
      })
      if (existing) {
        skipped += 1
        continue
      }
      const validation = await this.validator.validate(exercise)
      if (!validation.ok) {
        this.logger.warn(
          { key: exercise.key, problem: validation.problem },
          "starter exercise failed validation",
        )
        invalid.push(exercise.key)
        continue
      }
      await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(tables.tasks)
          .values({
            userId,
            source: "starter",
            starterKey: exercise.key,
            status: "open",
            track: exercise.track,
            difficulty: exercise.difficulty,
            topics: exercise.topics,
            datasetSlugs: exercise.datasetSlugs,
            mode: exercise.mode,
            title: exercise.title,
            stakeholder: exercise.stakeholder,
            businessContext: exercise.businessContext,
            requirements: exercise.requirements,
            acceptanceCriteria: exercise.acceptanceCriteria,
            expectedColumns: validation.expectedColumns,
            orderMatters: exercise.orderMatters,
            referenceSql: exercise.referenceSql,
            verificationSql: exercise.verificationSql,
            referenceSignature: validation.signature,
            explanation: exercise.explanation,
            estimatedMinutes: exercise.estimatedMinutes,
            createdAt: new Date(batchStartedAt - index * STARTER_ORDER_SPACING_MS),
          })
          .returning()
        if (row) {
          await tx
            .insert(tables.taskHints)
            .values(exercise.hints.map((body, position) => ({ taskId: row.id, position, body })))
        }
      })
      imported += 1
    }
    return { imported, skipped, invalid }
  }
}

export function starterMockResponder(
  exercises: () => Promise<readonly StarterExercise[]>,
): MockResponder {
  let cursor = 0
  return async (request) => {
    if (request.purpose === "submission_review") {
      return {
        summary:
          "Automated review in mock mode. The structure is clear and the result was evaluated by the grader.",
        strengths: ["Readable formatting and explicit column aliases."],
        improvements: ["Compare your filters with each requirement once more before submitting."],
        suggestedSql: null,
      }
    }
    const target = (request.metadata?.["target"] ?? null) as TaskTarget | null
    const existing = new Set((request.metadata?.["existingTitles"] ?? []) as string[])
    const all = await exercises()
    const unused = all.filter((exercise) => !existing.has(exercise.title))
    const pool = unused.length > 0 ? unused : all
    const ranked = [...pool].sort((left, right) => score(right, target) - score(left, target))
    const best = ranked.filter((exercise) => score(exercise, target) === score(ranked[0]!, target))
    const pick = best[cursor % Math.max(1, best.length)] ?? pool[0]
    cursor += 1
    if (!pick) {
      return null
    }
    const { key: _key, order: _order, ...definition } = pick
    return definition
  }
}

function score(exercise: StarterExercise, target: TaskTarget | null): number {
  if (!target) {
    return 0
  }
  return (
    (exercise.mode === target.mode ? 8 : 0) +
    (exercise.datasetSlugs.includes(target.datasetSlug) ? 4 : 0) +
    (exercise.difficulty === target.difficulty ? 2 : 0) +
    (exercise.track === target.track ? 1 : 0)
  )
}
