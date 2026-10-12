import { z } from "zod"
import { idSchema, nullableTimestampSchema, rowSchema, timestampSchema } from "./common"
import {
  columnTypeHintSchema,
  comparisonNoteSchema,
  difficultySchema,
  feedbackStatusSchema,
  jobStatusSchema,
  submissionStatusSchema,
  taskModeSchema,
  taskSourceSchema,
  taskStatusSchema,
  topicSchema,
  trackSchema,
  verdictSchema,
} from "./enums"
import { LIMITS } from "./limits"
import { sqlErrorSchema, sqlTextSchema } from "./sql"

export const stakeholderSchema = z.object({
  name: z.string(),
  role: z.string(),
  team: z.string(),
})
export type Stakeholder = z.infer<typeof stakeholderSchema>

export const expectedColumnSchema = z.object({
  name: z.string(),
  typeHint: columnTypeHintSchema,
})
export type ExpectedColumn = z.infer<typeof expectedColumnSchema>

export const taskDefinitionSchema = z.object({
  title: z.string(),
  track: trackSchema,
  difficulty: difficultySchema,
  topics: z.array(topicSchema),
  datasetSlugs: z.array(z.string()),
  mode: taskModeSchema,
  stakeholder: stakeholderSchema,
  businessContext: z.string(),
  requirements: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  expectedColumns: z.array(expectedColumnSchema),
  orderMatters: z.boolean(),
  referenceSql: z.string(),
  verificationSql: z.string().nullable(),
  hints: z.array(z.string()),
  explanation: z.string(),
  estimatedMinutes: z.number().int(),
})
export type TaskDefinition = z.infer<typeof taskDefinitionSchema>

export const generateTaskRequestSchema = z.object({
  track: trackSchema.optional(),
  difficulty: difficultySchema.optional(),
  topics: z.array(topicSchema).max(LIMITS.topicsPerTaskMax).optional(),
  datasetSlug: z.string().optional(),
})
export type GenerateTaskRequest = z.infer<typeof generateTaskRequestSchema>

export const generateTaskResponseSchema = z.object({ taskId: idSchema, jobId: z.string() })
export type GenerateTaskResponse = z.infer<typeof generateTaskResponseSchema>

export const taskSummarySchema = z.object({
  id: idSchema,
  ticketKey: z.string(),
  title: z.string(),
  status: taskStatusSchema,
  source: taskSourceSchema,
  track: trackSchema,
  difficulty: difficultySchema,
  topics: z.array(topicSchema),
  datasetSlugs: z.array(z.string()),
  mode: taskModeSchema,
  stakeholder: stakeholderSchema.nullable(),
  estimatedMinutes: z.number().int().nullable(),
  attempts: z.number().int(),
  createdAt: timestampSchema,
  solvedAt: nullableTimestampSchema,
})
export type TaskSummary = z.infer<typeof taskSummarySchema>

export const taskHintSchema = z.object({
  position: z.number().int(),
  body: z.string().nullable(),
  revealed: z.boolean(),
})
export type TaskHint = z.infer<typeof taskHintSchema>

export const taskGenerationSchema = z.object({
  jobId: z.string(),
  status: jobStatusSchema,
  error: z.string().nullable(),
})

export const comparisonSchema = z.object({
  orderChecked: z.boolean(),
  columnsMatch: z.boolean(),
  matchedByName: z.boolean(),
  expectedColumns: z.array(z.string()),
  actualColumns: z.array(z.string()),
  expectedRowCount: z.number().int(),
  actualRowCount: z.number().int(),
  missingRowCount: z.number().int(),
  extraRowCount: z.number().int(),
  firstMismatchIndex: z.number().int().nullable(),
  sampleMissing: z.array(rowSchema),
  sampleExtra: z.array(rowSchema),
  notes: z.array(comparisonNoteSchema),
})
export type Comparison = z.infer<typeof comparisonSchema>

export const reviewFeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  suggestedSql: z.string().nullable(),
})
export type ReviewFeedback = z.infer<typeof reviewFeedbackSchema>

export const submissionSchema = z.object({
  id: idSchema,
  taskId: idSchema,
  sqlText: z.string(),
  status: submissionStatusSchema,
  verdict: verdictSchema.nullable(),
  comparison: comparisonSchema.nullable(),
  error: sqlErrorSchema.nullable(),
  durationMs: z.number().int().nullable(),
  jobId: z.string().nullable(),
  feedbackStatus: feedbackStatusSchema,
  feedback: reviewFeedbackSchema.nullable(),
  submittedAt: timestampSchema,
  gradedAt: nullableTimestampSchema,
})
export type Submission = z.infer<typeof submissionSchema>

export const taskDetailSchema = taskSummarySchema.extend({
  businessContext: z.string(),
  requirements: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  expectedColumns: z.array(expectedColumnSchema),
  orderMatters: z.boolean(),
  hints: z.array(taskHintSchema),
  solution: z.object({ referenceSql: z.string(), explanation: z.string() }).nullable(),
  generation: taskGenerationSchema.nullable(),
  latestSubmission: submissionSchema.nullable(),
  draftSql: z.string().nullable(),
})
export type TaskDetail = z.infer<typeof taskDetailSchema>

export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  difficulty: difficultySchema.optional(),
  track: trackSchema.optional(),
  datasetSlug: z.string().optional(),
  search: z.string().max(LIMITS.searchMaxLength).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).optional(),
})
export type TaskListQuery = z.infer<typeof taskListQuerySchema>

export const taskPageSchema = z.object({
  items: z.array(taskSummarySchema),
  nextCursor: z.string().nullable(),
  counts: z.record(taskStatusSchema, z.number().int()),
})
export type TaskPage = z.infer<typeof taskPageSchema>

export const submitTaskRequestSchema = z.object({ sql: sqlTextSchema })
export type SubmitTaskRequest = z.infer<typeof submitTaskRequestSchema>

export const submitTaskResponseSchema = z.object({ submissionId: idSchema, jobId: z.string() })
export type SubmitTaskResponse = z.infer<typeof submitTaskResponseSchema>

export const saveDraftRequestSchema = z.object({ sql: z.string().max(LIMITS.sqlMaxLength) })

export const submissionListSchema = z.object({ items: z.array(submissionSchema) })

export const hintParamsSchema = z.object({
  id: idSchema,
  position: z.coerce.number().int().min(0),
})

export const submissionParamsSchema = z.object({ id: idSchema, submissionId: idSchema })

export const requestFeedbackResponseSchema = z.object({ jobId: z.string() })
