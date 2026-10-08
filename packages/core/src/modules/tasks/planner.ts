import type { GenerateTaskRequest, Topic, Track } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { and, count, eq, inArray } from "drizzle-orm"
import type { IdentityService } from "../identity/service"
import type { ProgressService } from "../progress/service"
import { chooseFocusTopics, difficultyForLevel } from "../progress/skills"
import type { WarehouseService } from "../warehouse/service"
import { SCRATCH_TOPICS, type TaskTarget } from "./types"

export type PlannerSettings = { starterDatasetSlug: string; starterTaskCount: number }

export class TaskPlanner {
  constructor(
    private readonly db: Database,
    private readonly identity: IdentityService,
    private readonly progress: ProgressService,
    private readonly warehouse: WarehouseService,
    private readonly settings: PlannerSettings,
  ) {}

  async resolve(userId: string, request: GenerateTaskRequest): Promise<TaskTarget> {
    const [preferences, skills] = await Promise.all([
      this.identity.preferences(userId),
      this.progress.skills(userId),
    ])
    const track: Track = request.track ?? preferences.defaultTrack
    const topics: Topic[] =
      request.topics && request.topics.length > 0
        ? request.topics
        : chooseFocusTopics(track, skills)
    const meanLevel =
      topics.reduce((sum, topic) => sum + skills[topic].level, 0) / Math.max(1, topics.length)
    const difficulty = request.difficulty ?? difficultyForLevel(meanLevel)
    const datasetSlug = request.datasetSlug ?? (await this.pickDataset(userId))
    const mode = topics.some((topic) => SCRATCH_TOPICS.includes(topic)) ? "scratch" : "read"
    return { track, difficulty, topics, datasetSlug, mode }
  }

  private async pickDataset(userId: string): Promise<string> {
    const slugs = await this.warehouse.datasetSchemas()
    const [solved] = await this.db
      .select({ total: count() })
      .from(tables.tasks)
      .where(and(eq(tables.tasks.userId, userId), eq(tables.tasks.status, "solved")))
    if (
      (solved?.total ?? 0) < this.settings.starterTaskCount &&
      slugs.includes(this.settings.starterDatasetSlug)
    ) {
      return this.settings.starterDatasetSlug
    }
    const usage = await this.db
      .select({ slugs: tables.tasks.datasetSlugs })
      .from(tables.tasks)
      .where(
        and(
          eq(tables.tasks.userId, userId),
          inArray(tables.tasks.status, ["open", "in_progress", "solved"]),
        ),
      )
    const counts = new Map(slugs.map((slug) => [slug, 0]))
    for (const row of usage) {
      for (const slug of row.slugs) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1)
      }
    }
    return (
      [...counts.entries()].sort((left, right) => left[1] - right[1])[0]?.[0] ??
      this.settings.starterDatasetSlug
    )
  }
}
