import { z } from "zod"
import { nullableTimestampSchema } from "./common"
import { difficultySchema, topicSchema, trackSchema } from "./enums"
import { LIMITS } from "./limits"

export const progressSummarySchema = z.object({
  tasksSolved: z.number().int(),
  tasksAttempted: z.number().int(),
  tasksOpen: z.number().int(),
  submissionsTotal: z.number().int(),
  passRate: z.number().nullable(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
  queriesToday: z.number().int(),
  queriesTotal: z.number().int(),
  averageDurationMs: z.number().nullable(),
  overallLevel: z.number(),
  recommendedDifficulty: difficultySchema,
  recommendedTrack: trackSchema,
})
export type ProgressSummary = z.infer<typeof progressSummarySchema>

export const topicSkillSchema = z.object({
  topic: topicSchema,
  level: z.number(),
  attempts: z.number().int(),
  passes: z.number().int(),
  lastPracticedAt: nullableTimestampSchema,
  unlocked: z.boolean(),
})
export type TopicSkill = z.infer<typeof topicSkillSchema>

export const skillListSchema = z.object({ items: z.array(topicSkillSchema) })

export const activityDaySchema = z.object({
  day: z.string(),
  queriesRun: z.number().int(),
  tasksAttempted: z.number().int(),
  tasksSolved: z.number().int(),
})
export type ActivityDay = z.infer<typeof activityDaySchema>

export const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(LIMITS.activityDaysMax).optional(),
})
export const activityListSchema = z.object({ items: z.array(activityDaySchema) })
