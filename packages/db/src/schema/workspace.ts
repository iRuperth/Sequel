import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { ColumnMeta } from "@sequel/contracts"
import { createdAt, primaryId, timestampColumn, updatedAt } from "./columns"
import {
  executionModeEnum,
  executionSourceEnum,
  executionStatusEnum,
  rejectionReasonEnum,
  sandboxSessionStatusEnum,
} from "./enums"
import { users } from "./identity"

export const savedQueries = pgTable(
  "saved_queries",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seedKey: text(),
    name: text().notNull(),
    description: text(),
    sqlText: text().notNull(),
    datasetSlug: text(),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isFavorite: boolean().notNull().default(false),
    lastRunAt: timestampColumn(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.userId, table.updatedAt),
    uniqueIndex().on(table.userId, table.seedKey),
  ],
)

export const sandboxSessions = pgTable(
  "sandbox_sessions",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schemaName: text().notNull().unique(),
    status: sandboxSessionStatusEnum().notNull().default("active"),
    createdAt: createdAt(),
    lastUsedAt: timestampColumn().notNull().defaultNow(),
    expiresAt: timestampColumn().notNull(),
  },
  (table) => [index().on(table.userId, table.status)],
)

export const queryExecutions = pgTable(
  "query_executions",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sqlText: text().notNull(),
    mode: executionModeEnum().notNull(),
    status: executionStatusEnum().notNull(),
    source: executionSourceEnum().notNull(),
    rejectionReason: rejectionReasonEnum(),
    errorMessage: text(),
    errorDetail: text(),
    errorPosition: integer(),
    sqlState: text(),
    durationMs: integer().notNull(),
    rowCount: integer(),
    rowsTruncated: boolean().notNull().default(false),
    statementCount: integer().notNull().default(1),
    columns: jsonb().$type<ColumnMeta[]>(),
    taskId: uuid(),
    sandboxSessionId: uuid().references(() => sandboxSessions.id, { onDelete: "set null" }),
    executedAt: createdAt(),
  },
  (table) => [
    index().on(table.userId, table.executedAt),
    index().on(table.status),
    index().on(table.source),
  ],
)
