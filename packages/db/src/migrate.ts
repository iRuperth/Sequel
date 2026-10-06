import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import type { Database } from "./client"

export const MIGRATIONS_FOLDER = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations")

export async function runMigrations(db: Database, migrationsFolder = MIGRATIONS_FOLDER) {
  await migrate(db, { migrationsFolder })
}
