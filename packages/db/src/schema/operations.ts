import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { QualityCheckConfig, WidgetConfig, WidgetPosition } from "@sequel/contracts"
import { createdAt, primaryId, timestampColumn, updatedAt } from "./columns"
import {
  jobKindEnum,
  jobStatusEnum,
  qualityCheckKindEnum,
  qualityRunStatusEnum,
  runStatusEnum,
  severityEnum,
  widgetKindEnum,
} from "./enums"
import { users } from "./identity"
import { queryExecutions, savedQueries } from "./workspace"

export const dailyActivity = pgTable(
  "daily_activity",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date({ mode: "string" }).notNull(),
    queriesRun: integer().notNull().default(0),
    tasksAttempted: integer().notNull().default(0),
    tasksSolved: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
)

export const jobs = pgTable(
  "jobs",
  {
    id: text().primaryKey(),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
    kind: jobKindEnum().notNull(),
    status: jobStatusEnum().notNull().default("queued"),
    progress: integer().notNull().default(0),
    stage: text(),
    subjectId: text(),
    error: text(),
    attempts: integer().notNull().default(0),
    createdAt: createdAt(),
    startedAt: timestampColumn(),
    finishedAt: timestampColumn(),
  },
  (table) => [index().on(table.kind, table.createdAt), index().on(table.status)],
)

export const dashboards = pgTable(
  "dashboards",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seedKey: text(),
    name: text().notNull(),
    description: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex().on(table.userId, table.seedKey)],
)

export const dashboardWidgets = pgTable(
  "dashboard_widgets",
  {
    id: primaryId(),
    dashboardId: uuid()
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    savedQueryId: uuid()
      .notNull()
      .references(() => savedQueries.id, { onDelete: "cascade" }),
    title: text().notNull(),
    kind: widgetKindEnum().notNull(),
    config: jsonb().$type<WidgetConfig>().notNull(),
    position: jsonb().$type<WidgetPosition>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.dashboardId)],
)

export const scheduledQueries = pgTable("scheduled_queries", {
  id: primaryId(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  savedQueryId: uuid()
    .notNull()
    .references(() => savedQueries.id, { onDelete: "cascade" }),
  name: text().notNull(),
  cronExpression: text().notNull(),
  timezone: text().notNull(),
  isEnabled: boolean().notNull().default(true),
  lastRunAt: timestampColumn(),
  nextRunAt: timestampColumn(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const scheduledQueryRuns = pgTable(
  "scheduled_query_runs",
  {
    id: primaryId(),
    scheduledQueryId: uuid()
      .notNull()
      .references(() => scheduledQueries.id, { onDelete: "cascade" }),
    executionId: uuid().references(() => queryExecutions.id, { onDelete: "set null" }),
    status: runStatusEnum().notNull(),
    rowCount: integer(),
    durationMs: integer(),
    error: text(),
    startedAt: createdAt(),
    finishedAt: timestampColumn(),
  },
  (table) => [index().on(table.scheduledQueryId, table.startedAt)],
)

export const qualityChecks = pgTable("quality_checks", {
  id: primaryId(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  seedKey: text().unique(),
  kind: qualityCheckKindEnum().notNull(),
  targetSchema: text().notNull(),
  targetTable: text().notNull(),
  targetColumn: text(),
  config: jsonb().$type<QualityCheckConfig>().notNull(),
  severity: severityEnum().notNull(),
  isEnabled: boolean().notNull().default(true),
  cronExpression: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const qualityCheckRuns = pgTable(
  "quality_check_runs",
  {
    id: primaryId(),
    qualityCheckId: uuid()
      .notNull()
      .references(() => qualityChecks.id, { onDelete: "cascade" }),
    executionId: uuid().references(() => queryExecutions.id, { onDelete: "set null" }),
    status: qualityRunStatusEnum().notNull(),
    observedValue: text(),
    message: text().notNull(),
    durationMs: integer(),
    ranAt: createdAt(),
  },
  (table) => [index().on(table.qualityCheckId, table.ranAt)],
)

export const catalogRefreshes = pgTable("catalog_refreshes", {
  id: primaryId(),
  startedAt: createdAt(),
  finishedAt: timestampColumn(),
  tableCount: integer().notNull().default(0),
  notes: text(),
})
