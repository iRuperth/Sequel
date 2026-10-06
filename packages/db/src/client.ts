import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"

export type Database = NodePgDatabase<typeof schema>

export type DatabaseHandle = {
  db: Database
  pool: pg.Pool
  close: () => Promise<void>
}

export type DatabaseOptions = {
  url: string
  maxConnections?: number
  applicationName: string
}

export function createDatabase(options: DatabaseOptions): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.maxConnections,
    application_name: options.applicationName,
  })
  const db = drizzle({ client: pool, schema, casing: "snake_case" })
  return { db, pool, close: () => pool.end() }
}
