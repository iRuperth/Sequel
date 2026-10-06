import type { RelationKind } from "@sequel/contracts"
import type pg from "pg"
import { relationKindFromCode } from "./introspect"

export type ScratchObject = { name: string; kind: RelationKind; rowEstimate: number | null }

export type ScratchRoles = { reader: string; writer: string }

export class ScratchManager {
  constructor(
    private readonly admin: pg.Pool,
    private readonly roles: ScratchRoles,
  ) {}

  async create(schema: string): Promise<void> {
    const client = await this.admin.connect()
    try {
      const id = (value: string) => client.escapeIdentifier(value)
      await client.query("BEGIN")
      await client.query(
        `CREATE SCHEMA IF NOT EXISTS ${id(schema)} AUTHORIZATION ${id(this.roles.writer)}`,
      )
      await client.query(`GRANT USAGE ON SCHEMA ${id(schema)} TO ${id(this.roles.reader)}`)
      await client.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${id(this.roles.writer)} IN SCHEMA ${id(schema)} GRANT SELECT ON TABLES TO ${id(this.roles.reader)}`,
      )
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  async drop(schema: string): Promise<void> {
    const client = await this.admin.connect()
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${client.escapeIdentifier(schema)} CASCADE`)
    } finally {
      client.release()
    }
  }

  async reset(schema: string): Promise<void> {
    await this.drop(schema)
    await this.create(schema)
  }

  async exists(schema: string): Promise<boolean> {
    const result = await this.admin.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])
    return (result.rowCount ?? 0) > 0
  }

  async listSchemas(prefix: string): Promise<string[]> {
    const result = await this.admin.query<{ nspname: string }>(
      "SELECT nspname FROM pg_namespace WHERE starts_with(nspname, $1) ORDER BY nspname",
      [prefix],
    )
    return result.rows.map((row) => row.nspname)
  }

  async objects(schema: string): Promise<ScratchObject[]> {
    const result = await this.admin.query<{ name: string; kind: string; estimate: string | null }>(
      `SELECT c.relname AS name, c.relkind AS kind, c.reltuples::bigint AS estimate
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
        ORDER BY c.relname`,
      [schema],
    )
    return result.rows.map((row) => ({
      name: row.name,
      kind: relationKindFromCode(row.kind),
      rowEstimate: row.estimate === null || Number(row.estimate) < 0 ? null : Number(row.estimate),
    }))
  }
}
