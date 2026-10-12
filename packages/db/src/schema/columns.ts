import { timestamp, uuid } from "drizzle-orm/pg-core"

export const primaryId = () => uuid().primaryKey().defaultRandom()

export const createdAt = () =>
  timestamp({ withTimezone: true, mode: "date", precision: 3 }).notNull().defaultNow()

export const updatedAt = () =>
  timestamp({ withTimezone: true, mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

export const timestampColumn = () => timestamp({ withTimezone: true, mode: "date", precision: 3 })
