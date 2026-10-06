import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { createdAt, primaryId, updatedAt } from "./columns"
import { trackEnum } from "./enums"

export const users = pgTable("users", {
  id: primaryId(),
  handle: text().notNull().unique(),
  displayName: text().notNull(),
  roleTitle: text().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const userPreferences = pgTable("user_preferences", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  editorFontSize: integer().notNull(),
  editorTabSize: integer().notNull(),
  editorWordWrap: boolean().notNull(),
  editorLineNumbers: boolean().notNull(),
  editorAutocomplete: boolean().notNull(),
  resultPageSize: integer().notNull(),
  defaultTrack: trackEnum().notNull(),
  llmFeedbackEnabled: boolean().notNull(),
  updatedAt: updatedAt(),
})
