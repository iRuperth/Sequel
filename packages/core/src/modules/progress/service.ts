import type {
  ActivityDay,
  Difficulty,
  ProgressSummary,
  Topic,
  TopicSkill,
  Track,
} from "@sequel/contracts"
import { LIMITS, TOPICS } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { and, avg, count, eq, gte, sql } from "drizzle-orm"
import { addDays, isoOrNull, utcDay } from "../../shared/time"
import type { IdentityService } from "../identity/service"
import {
  difficultyForLevel,
  emptySkillMap,
  isUnlocked,
  nextLevel,
  overallLevel,
  recommendedTrack,
  type SkillMap,
} from "./skills"

export class ProgressService {
  constructor(
    private readonly db: Database,
    private readonly identity: IdentityService,
  ) {}

  async skills(userId: string): Promise<SkillMap> {
    const rows = await this.db
      .select()
      .from(tables.userTopicSkills)
      .where(eq(tables.userTopicSkills.userId, userId))
    const map = emptySkillMap()
    for (const row of rows) {
      map[row.topic] = {
        level: row.level,
        attempts: row.attempts,
        passes: row.passes,
        lastPracticedAt: row.lastPracticedAt,
      }
    }
    return map
  }

  async skillList(userId: string): Promise<TopicSkill[]> {
    const skills = await this.skills(userId)
    return TOPICS.map((topic) => ({
      topic,
      level: skills[topic].level,
      attempts: skills[topic].attempts,
      passes: skills[topic].passes,
      lastPracticedAt: isoOrNull(skills[topic].lastPracticedAt),
      unlocked: isUnlocked(topic, skills),
    }))
  }

  async recordGrade(
    userId: string,
    topics: readonly Topic[],
    difficulty: Difficulty,
    passed: boolean,
  ): Promise<void> {
    const skills = await this.skills(userId)
    const now = new Date()
    for (const topic of new Set(topics)) {
      const current = skills[topic]
      const level = nextLevel(current.level, difficulty, passed)
      await this.db
        .insert(tables.userTopicSkills)
        .values({ userId, topic, level, attempts: 1, passes: passed ? 1 : 0, lastPracticedAt: now })
        .onConflictDoUpdate({
          target: [tables.userTopicSkills.userId, tables.userTopicSkills.topic],
          set: {
            level,
            attempts: sql`${tables.userTopicSkills.attempts} + 1`,
            passes: sql`${tables.userTopicSkills.passes} + ${passed ? 1 : 0}`,
            lastPracticedAt: now,
          },
        })
    }
  }

  async activity(
    userId: string,
    days: number = LIMITS.activityDaysDefault,
  ): Promise<ActivityDay[]> {
    const since = utcDay(addDays(new Date(), -days + 1))
    const rows = await this.db
      .select()
      .from(tables.dailyActivity)
      .where(and(eq(tables.dailyActivity.userId, userId), gte(tables.dailyActivity.day, since)))
    const byDay = new Map(rows.map((row) => [row.day, row]))
    return Array.from({ length: days }, (_value, index) => {
      const day = utcDay(addDays(new Date(), index - days + 1))
      const row = byDay.get(day)
      return {
        day,
        queriesRun: row?.queriesRun ?? 0,
        tasksAttempted: row?.tasksAttempted ?? 0,
        tasksSolved: row?.tasksSolved ?? 0,
      }
    })
  }

  async summary(userId: string): Promise<ProgressSummary> {
    const [skills, preferences, taskCounts, submissionStats, queryStats, streaks, today] =
      await Promise.all([
        this.skills(userId),
        this.identity.preferences(userId),
        this.db
          .select({ status: tables.tasks.status, total: count() })
          .from(tables.tasks)
          .where(eq(tables.tasks.userId, userId))
          .groupBy(tables.tasks.status),
        this.db
          .select({
            total: count(),
            passed:
              sql<number>`count(*) filter (where ${tables.taskSubmissions.verdict} = 'pass')`.mapWith(
                Number,
              ),
          })
          .from(tables.taskSubmissions)
          .where(eq(tables.taskSubmissions.userId, userId)),
        this.db
          .select({ total: count(), averageMs: avg(tables.queryExecutions.durationMs) })
          .from(tables.queryExecutions)
          .where(
            and(
              eq(tables.queryExecutions.userId, userId),
              eq(tables.queryExecutions.source, "workbench"),
            ),
          ),
        this.streaks(userId),
        this.db.query.dailyActivity.findFirst({
          where: and(
            eq(tables.dailyActivity.userId, userId),
            eq(tables.dailyActivity.day, utcDay()),
          ),
        }),
      ])
    const statusCount = (statuses: string[]) =>
      taskCounts
        .filter((row) => statuses.includes(row.status))
        .reduce((sum, row) => sum + row.total, 0)
    const submissions = submissionStats[0]
    const overall = overallLevel(skills)
    return {
      tasksSolved: statusCount(["solved"]),
      tasksAttempted: statusCount(["solved", "in_progress", "abandoned"]),
      tasksOpen: statusCount(["open", "in_progress"]),
      submissionsTotal: submissions?.total ?? 0,
      passRate:
        submissions && submissions.total > 0 ? submissions.passed / submissions.total : null,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      queriesToday: today?.queriesRun ?? 0,
      queriesTotal: queryStats[0]?.total ?? 0,
      averageDurationMs:
        queryStats[0]?.averageMs === null || queryStats[0]?.averageMs === undefined
          ? null
          : Number(queryStats[0].averageMs),
      overallLevel: overall,
      recommendedDifficulty: difficultyForLevel(overall),
      recommendedTrack: recommendedTrack(skills, preferences.defaultTrack as Track),
    }
  }

  private async streaks(userId: string): Promise<{ current: number; longest: number }> {
    const result = await this.db.execute<{ current: number | null; longest: number | null }>(sql`
      WITH active AS (
        SELECT day::date AS day FROM ${tables.dailyActivity}
         WHERE ${tables.dailyActivity.userId} = ${userId}
           AND (${tables.dailyActivity.queriesRun} > 0 OR ${tables.dailyActivity.tasksAttempted} > 0)
      ), grouped AS (
        SELECT day, day - (ROW_NUMBER() OVER (ORDER BY day))::int AS grp FROM active
      ), runs AS (
        SELECT grp, count(*)::int AS length, max(day) AS last_day FROM grouped GROUP BY grp
      )
      SELECT
        (SELECT length FROM runs WHERE last_day >= (now() AT TIME ZONE 'UTC')::date - 1 ORDER BY last_day DESC LIMIT 1) AS current,
        (SELECT max(length) FROM runs) AS longest
    `)
    const row = result.rows[0]
    return { current: Number(row?.current ?? 0), longest: Number(row?.longest ?? 0) }
  }
}
