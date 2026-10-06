import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
} from "drizzle-orm/pg-core"
import type { Row } from "@sequel/contracts"
import { timestampColumn } from "./columns"
import { linkKindEnum, relationKindEnum } from "./enums"

export const catalogDatasets = pgTable("catalog_datasets", {
  slug: text().primaryKey(),
  name: text().notNull(),
  domain: text().notNull(),
  description: text().notNull(),
  ownerTeam: text().notNull(),
  displayOrder: integer().notNull(),
  tags: text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
})

export const catalogTables = pgTable(
  "catalog_tables",
  {
    schemaName: text().notNull(),
    tableName: text().notNull(),
    datasetSlug: text()
      .notNull()
      .references(() => catalogDatasets.slug, { onDelete: "cascade" }),
    kind: relationKindEnum().notNull().default("table"),
    description: text().notNull(),
    grain: text(),
    ownerTeam: text().notNull(),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    rowCount: bigint({ mode: "number" }),
    sampleColumns: jsonb().$type<{ name: string; dataType: string; dataTypeId: number }[]>(),
    sampleRows: jsonb().$type<Row[]>(),
    refreshedAt: timestampColumn(),
  },
  (table) => [primaryKey({ columns: [table.schemaName, table.tableName] })],
)

export const catalogColumns = pgTable(
  "catalog_columns",
  {
    schemaName: text().notNull(),
    tableName: text().notNull(),
    columnName: text().notNull(),
    ordinal: integer().notNull(),
    dataType: text().notNull(),
    isNullable: boolean().notNull(),
    isPrimaryKey: boolean().notNull().default(false),
    description: text().notNull(),
    isPii: boolean().notNull().default(false),
    exampleValues: jsonb().$type<string[]>().notNull().default([]),
    nullFraction: real(),
    distinctCount: real(),
  },
  (table) => [primaryKey({ columns: [table.schemaName, table.tableName, table.columnName] })],
)

export const catalogLinks = pgTable(
  "catalog_links",
  {
    fromSchema: text().notNull(),
    fromTable: text().notNull(),
    fromColumn: text().notNull(),
    toSchema: text().notNull(),
    toTable: text().notNull(),
    toColumn: text().notNull(),
    kind: linkKindEnum().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.fromSchema, table.fromTable, table.fromColumn, table.toSchema, table.toTable],
    }),
  ],
)
