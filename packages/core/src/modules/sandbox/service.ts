import type { SandboxSession } from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { GRADE_SCHEMA_PREFIX, SCRATCH_SCHEMA_PREFIX, type SqlEngine } from "@sequel/sql-engine"
import { and, eq, lt } from "drizzle-orm"
import type { Logger } from "../../shared/logger"
import { shortId } from "../../shared/identifiers"
import { addHours, iso } from "../../shared/time"

type SessionRow = typeof tables.sandboxSessions.$inferSelect

const GRADE_SCHEMA_MAX_AGE_MS = 15 * 60_000

export class SandboxService {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly ttlHours: number,
    private readonly logger: Logger,
  ) {}

  async active(userId: string): Promise<SessionRow | null> {
    const row = await this.db.query.sandboxSessions.findFirst({
      where: and(
        eq(tables.sandboxSessions.userId, userId),
        eq(tables.sandboxSessions.status, "active"),
      ),
    })
    if (!row) {
      return null
    }
    if (
      row.expiresAt.getTime() < Date.now() ||
      !(await this.engine.scratch.exists(row.schemaName))
    ) {
      await this.expire(row)
      return null
    }
    return row
  }

  async activeSchema(userId: string): Promise<string | null> {
    return (await this.active(userId))?.schemaName ?? null
  }

  async ensure(userId: string): Promise<SessionRow> {
    const existing = await this.active(userId)
    if (existing) {
      return this.touch(existing)
    }
    const schemaName = `${SCRATCH_SCHEMA_PREFIX}${shortId()}`
    await this.engine.scratch.create(schemaName)
    const now = new Date()
    const [row] = await this.db
      .insert(tables.sandboxSessions)
      .values({
        userId,
        schemaName,
        status: "active",
        lastUsedAt: now,
        expiresAt: addHours(now, this.ttlHours),
      })
      .returning()
    if (!row) {
      throw new Error("Failed to create sandbox session")
    }
    return row
  }

  async touch(row: SessionRow): Promise<SessionRow> {
    const now = new Date()
    const [updated] = await this.db
      .update(tables.sandboxSessions)
      .set({ lastUsedAt: now, expiresAt: addHours(now, this.ttlHours) })
      .where(eq(tables.sandboxSessions.id, row.id))
      .returning()
    return updated ?? row
  }

  async reset(userId: string): Promise<SessionRow> {
    const existing = await this.active(userId)
    if (!existing) {
      return this.ensure(userId)
    }
    await this.engine.scratch.reset(existing.schemaName)
    return this.touch(existing)
  }

  async describe(row: SessionRow | null): Promise<SandboxSession | null> {
    if (!row) {
      return null
    }
    return {
      id: row.id,
      schemaName: row.schemaName,
      status: row.status,
      createdAt: iso(row.createdAt),
      lastUsedAt: iso(row.lastUsedAt),
      expiresAt: iso(row.expiresAt),
      objects: await this.engine.scratch.objects(row.schemaName),
    }
  }

  async createGradeSchema(): Promise<string> {
    const name = `${GRADE_SCHEMA_PREFIX}${Math.floor(Date.now() / 1000)}_${shortId()}`
    await this.engine.scratch.create(name)
    return name
  }

  async dropGradeSchema(name: string): Promise<void> {
    await this.engine.scratch.drop(name)
  }

  async sweep(): Promise<{ expired: number; gradeSchemas: number }> {
    const stale = await this.db
      .select()
      .from(tables.sandboxSessions)
      .where(
        and(
          eq(tables.sandboxSessions.status, "active"),
          lt(tables.sandboxSessions.expiresAt, new Date()),
        ),
      )
    for (const row of stale) {
      await this.expire(row)
    }
    const gradeSchemas = await this.engine.scratch.listSchemas(GRADE_SCHEMA_PREFIX)
    let dropped = 0
    for (const schema of gradeSchemas) {
      const epoch = Number(schema.slice(GRADE_SCHEMA_PREFIX.length).split("_")[0])
      if (Number.isFinite(epoch) && Date.now() - epoch * 1000 > GRADE_SCHEMA_MAX_AGE_MS) {
        await this.engine.scratch.drop(schema)
        dropped += 1
      }
    }
    this.logger.info({ expired: stale.length, gradeSchemas: dropped }, "sandbox sweep finished")
    return { expired: stale.length, gradeSchemas: dropped }
  }

  private async expire(row: SessionRow): Promise<void> {
    await this.engine.scratch.drop(row.schemaName)
    await this.db
      .update(tables.sandboxSessions)
      .set({ status: "expired" })
      .where(eq(tables.sandboxSessions.id, row.id))
  }
}
