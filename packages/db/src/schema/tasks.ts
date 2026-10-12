import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  real,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type {
  Comparison,
  ExpectedColumn,
  ReviewFeedback,
  SqlError,
  Stakeholder,
} from "@sequel/contracts"
import { createdAt, primaryId, timestampColumn, updatedAt } from "./columns"
import {
  difficultyEnum,
  feedbackStatusEnum,
  submissionStatusEnum,
  taskModeEnum,
  taskSourceEnum,
  taskStatusEnum,
  topicEnum,
  trackEnum,
  verdictEnum,
} from "./enums"
import { users } from "./identity"
import { queryExecutions } from "./workspace"

export type ReferenceSignature = {
  columns: string[]
  columnTypes: string[]
  rowCount: number
  digest: string
  rows: (string | number | boolean | null)[][]
}

export type LlmUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  attempts: number
  latencyMs: number
}

export const taskTicketSequence = pgSequence("task_ticket_seq", { startWith: 1000 })

export const tasks = pgTable(
  "tasks",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticketNumber: integer()
      .notNull()
      .unique()
      .default(sql`nextval('task_ticket_seq')`),
    source: taskSourceEnum().notNull(),
    starterKey: text(),
    status: taskStatusEnum().notNull(),
    track: trackEnum().notNull(),
    difficulty: difficultyEnum().notNull(),
    topics: topicEnum()
      .array()
      .notNull()
      .default(sql`'{}'`),
    datasetSlugs: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    mode: taskModeEnum().notNull().default("read"),
    title: text().notNull(),
    stakeholder: jsonb().$type<Stakeholder>(),
    businessContext: text().notNull().default(""),
    requirements: jsonb().$type<string[]>().notNull().default([]),
    acceptanceCriteria: jsonb().$type<string[]>().notNull().default([]),
    expectedColumns: jsonb().$type<ExpectedColumn[]>().notNull().default([]),
    orderMatters: boolean().notNull().default(false),
    referenceSql: text(),
    verificationSql: text(),
    referenceSignature: jsonb().$type<ReferenceSignature>(),
    explanation: text(),
    estimatedMinutes: integer(),
    draftSql: text(),
    generationJobId: text(),
    generationError: text(),
    llmModel: text(),
    llmUsage: jsonb().$type<LlmUsage>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    solvedAt: timestampColumn(),
  },
  (table) => [
    index().on(table.userId, table.status),
    index().on(table.userId, table.createdAt),
    uniqueIndex().on(table.userId, table.starterKey),
  ],
)

export const taskHints = pgTable(
  "task_hints",
  {
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    body: text().notNull(),
    revealedAt: timestampColumn(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.position] })],
)

export const taskSubmissions = pgTable(
  "task_submissions",
  {
    id: primaryId(),
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sqlText: text().notNull(),
    status: submissionStatusEnum().notNull().default("pending"),
    verdict: verdictEnum(),
    comparison: jsonb().$type<Comparison>(),
    error: jsonb().$type<SqlError>(),
    durationMs: integer(),
    executionId: uuid().references(() => queryExecutions.id, { onDelete: "set null" }),
    jobId: text(),
    feedbackStatus: feedbackStatusEnum().notNull().default("none"),
    feedback: jsonb().$type<ReviewFeedback>(),
    submittedAt: createdAt(),
    gradedAt: timestampColumn(),
  },
  (table) => [index().on(table.taskId, table.submittedAt)],
)

export const userTopicSkills = pgTable(
  "user_topic_skills",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: topicEnum().notNull(),
    level: real().notNull(),
    attempts: integer().notNull().default(0),
    passes: integer().notNull().default(0),
    lastPracticedAt: timestampColumn(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.topic] })],
)
