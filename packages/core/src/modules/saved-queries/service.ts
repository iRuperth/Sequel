import type {
  CreateSavedQueryRequest,
  SavedQuery,
  SavedQueryListQuery,
  UpdateSavedQueryRequest,
} from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm"
import { notFound } from "../../shared/errors"
import { iso, isoOrNull } from "../../shared/time"

type SavedQueryRow = typeof tables.savedQueries.$inferSelect

export function toSavedQuery(row: SavedQueryRow): SavedQuery {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sqlText: row.sqlText,
    datasetSlug: row.datasetSlug,
    tags: row.tags,
    isFavorite: row.isFavorite,
    lastRunAt: isoOrNull(row.lastRunAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }
}

export class SavedQueryService {
  constructor(private readonly db: Database) {}

  async list(userId: string, query: SavedQueryListQuery): Promise<SavedQuery[]> {
    const filters: SQL[] = [eq(tables.savedQueries.userId, userId)]
    if (query.favorites === "true") {
      filters.push(eq(tables.savedQueries.isFavorite, true))
    }
    if (query.search) {
      const pattern = `%${query.search}%`
      const match = or(
        ilike(tables.savedQueries.name, pattern),
        ilike(tables.savedQueries.sqlText, pattern),
      )
      if (match) {
        filters.push(match)
      }
    }
    const rows = await this.db
      .select()
      .from(tables.savedQueries)
      .where(and(...filters))
      .orderBy(desc(tables.savedQueries.isFavorite), desc(tables.savedQueries.updatedAt))
    return rows.map(toSavedQuery)
  }

  async row(userId: string, id: string): Promise<SavedQueryRow> {
    const row = await this.db.query.savedQueries.findFirst({
      where: and(eq(tables.savedQueries.id, id), eq(tables.savedQueries.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return row
  }

  async get(userId: string, id: string): Promise<SavedQuery> {
    return toSavedQuery(await this.row(userId, id))
  }

  async create(
    userId: string,
    input: CreateSavedQueryRequest,
    seedKey: string | null = null,
  ): Promise<SavedQuery> {
    const [row] = await this.db
      .insert(tables.savedQueries)
      .values({
        userId,
        seedKey,
        name: input.name,
        description: input.description ?? null,
        sqlText: input.sqlText,
        datasetSlug: input.datasetSlug ?? null,
        tags: input.tags ?? [],
        isFavorite: input.isFavorite ?? false,
      })
      .returning()
    if (!row) {
      throw new Error("Failed to create saved query")
    }
    return toSavedQuery(row)
  }

  async update(userId: string, id: string, input: UpdateSavedQueryRequest): Promise<SavedQuery> {
    await this.row(userId, id)
    const [row] = await this.db
      .update(tables.savedQueries)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sqlText !== undefined ? { sqlText: input.sqlText } : {}),
        ...(input.datasetSlug !== undefined ? { datasetSlug: input.datasetSlug } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
      })
      .where(eq(tables.savedQueries.id, id))
      .returning()
    if (!row) {
      throw notFound()
    }
    return toSavedQuery(row)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.row(userId, id)
    await this.db.delete(tables.savedQueries).where(eq(tables.savedQueries.id, id))
  }

  async markRun(id: string): Promise<void> {
    await this.db
      .update(tables.savedQueries)
      .set({ lastRunAt: new Date() })
      .where(eq(tables.savedQueries.id, id))
  }

  async upsertSeed(
    userId: string,
    seedKey: string,
    input: CreateSavedQueryRequest,
  ): Promise<string> {
    const existing = await this.db.query.savedQueries.findFirst({
      where: and(eq(tables.savedQueries.userId, userId), eq(tables.savedQueries.seedKey, seedKey)),
    })
    if (existing) {
      await this.update(userId, existing.id, input)
      return existing.id
    }
    return (await this.create(userId, input, seedKey)).id
  }
}
