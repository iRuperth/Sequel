import type {
  Dashboard,
  DashboardData,
  DashboardSummary,
  UpsertWidgetRequest,
  Widget,
  WidgetData,
} from "@sequel/contracts"
import { tables, type Database } from "@sequel/db"
import { REDIS_KEYS } from "@sequel/queue"
import type { SqlEngine } from "@sequel/sql-engine"
import { and, asc, count, desc, eq, inArray } from "drizzle-orm"
import type { JsonCache } from "../../shared/cache"
import { notFound } from "../../shared/errors"
import { iso } from "../../shared/time"
import { presentError } from "../queries/mapper"
import type { ExecutionRecorder } from "../queries/recorder"
import type { SandboxService } from "../sandbox/service"
import type { WarehouseService } from "../warehouse/service"

type DashboardRow = typeof tables.dashboards.$inferSelect
type WidgetRow = typeof tables.dashboardWidgets.$inferSelect

export type DashboardInput = { name: string; description?: string | null }

export class DashboardService {
  constructor(
    private readonly db: Database,
    private readonly engine: SqlEngine,
    private readonly warehouse: WarehouseService,
    private readonly sandbox: SandboxService,
    private readonly recorder: ExecutionRecorder,
    private readonly cache: JsonCache,
    private readonly ttlSeconds: number,
    private readonly maxRows: number,
  ) {}

  async list(userId: string): Promise<DashboardSummary[]> {
    const rows = await this.db
      .select()
      .from(tables.dashboards)
      .where(eq(tables.dashboards.userId, userId))
      .orderBy(desc(tables.dashboards.updatedAt))
    const counts = await this.widgetCounts(rows.map((row) => row.id))
    return rows.map((row) => this.summary(row, counts.get(row.id) ?? 0))
  }

  async get(userId: string, id: string): Promise<Dashboard> {
    const row = await this.row(userId, id)
    const widgets = await this.widgets(id)
    return { ...this.summary(row, widgets.length), widgets }
  }

  async create(
    userId: string,
    input: DashboardInput,
    seedKey: string | null = null,
  ): Promise<Dashboard> {
    const [row] = await this.db
      .insert(tables.dashboards)
      .values({ userId, seedKey, name: input.name, description: input.description ?? null })
      .returning()
    if (!row) {
      throw new Error("Failed to create dashboard")
    }
    return { ...this.summary(row, 0), widgets: [] }
  }

  async update(userId: string, id: string, input: Partial<DashboardInput>): Promise<Dashboard> {
    await this.row(userId, id)
    await this.db
      .update(tables.dashboards)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      })
      .where(eq(tables.dashboards.id, id))
    return this.get(userId, id)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.row(userId, id)
    await this.db.delete(tables.dashboards).where(eq(tables.dashboards.id, id))
    await this.cache.deleteByPrefix(`${REDIS_KEYS.dashboardCachePrefix}${id}`)
  }

  async addWidget(userId: string, id: string, input: UpsertWidgetRequest): Promise<Widget> {
    await this.row(userId, id)
    await this.assertSavedQuery(userId, input.savedQueryId)
    const [row] = await this.db
      .insert(tables.dashboardWidgets)
      .values({ dashboardId: id, ...input })
      .returning()
    if (!row) {
      throw new Error("Failed to create widget")
    }
    await this.touch(id)
    return (await this.widgets(id)).find((widget) => widget.id === row.id) as Widget
  }

  async updateWidget(
    userId: string,
    id: string,
    widgetId: string,
    input: UpsertWidgetRequest,
  ): Promise<Widget> {
    await this.row(userId, id)
    await this.assertSavedQuery(userId, input.savedQueryId)
    const [row] = await this.db
      .update(tables.dashboardWidgets)
      .set(input)
      .where(
        and(eq(tables.dashboardWidgets.id, widgetId), eq(tables.dashboardWidgets.dashboardId, id)),
      )
      .returning()
    if (!row) {
      throw notFound()
    }
    await this.cache.deleteByPrefix(`${REDIS_KEYS.dashboardCachePrefix}${id}`)
    await this.touch(id)
    return (await this.widgets(id)).find((widget) => widget.id === widgetId) as Widget
  }

  async removeWidget(userId: string, id: string, widgetId: string): Promise<void> {
    await this.row(userId, id)
    await this.db
      .delete(tables.dashboardWidgets)
      .where(
        and(eq(tables.dashboardWidgets.id, widgetId), eq(tables.dashboardWidgets.dashboardId, id)),
      )
    await this.touch(id)
  }

  async data(userId: string, id: string, refresh: boolean): Promise<DashboardData> {
    await this.row(userId, id)
    const rows = await this.db
      .select({ widget: tables.dashboardWidgets, query: tables.savedQueries })
      .from(tables.dashboardWidgets)
      .innerJoin(
        tables.savedQueries,
        eq(tables.savedQueries.id, tables.dashboardWidgets.savedQueryId),
      )
      .where(eq(tables.dashboardWidgets.dashboardId, id))
    const scratch = await this.sandbox.active(userId)
    const searchPath = await this.warehouse.searchPath(scratch?.schemaName ?? null)
    const items = await Promise.all(
      rows.map(async ({ widget, query }): Promise<WidgetData> => {
        const key = `${REDIS_KEYS.dashboardCachePrefix}${id}:${widget.id}:${query.updatedAt.getTime()}`
        if (!refresh) {
          const cached = await this.cache.get<WidgetData>(key)
          if (cached) {
            return { ...cached, cached: true }
          }
        }
        const outcome = await this.engine.runner.execute({
          sql: query.sqlText,
          mode: "read",
          searchPath,
          ownedSchemas: scratch ? [scratch.schemaName] : [],
          maxRows: this.maxRows,
        })
        await this.recorder.record({
          userId,
          sql: query.sqlText,
          mode: "read",
          source: "dashboard",
          outcome,
        })
        const data: WidgetData = {
          widgetId: widget.id,
          result: outcome.result,
          error: presentError(outcome.error),
          executedAt: new Date().toISOString(),
          cached: false,
        }
        if (outcome.status === "succeeded") {
          await this.cache.set(key, data, this.ttlSeconds)
        }
        return data
      }),
    )
    return { items }
  }

  async upsertSeed(
    userId: string,
    seedKey: string,
    input: DashboardInput,
    widgets: UpsertWidgetRequest[],
  ): Promise<void> {
    const existing = await this.db.query.dashboards.findFirst({
      where: and(eq(tables.dashboards.userId, userId), eq(tables.dashboards.seedKey, seedKey)),
    })
    const dashboard = existing
      ? await this.update(userId, existing.id, input)
      : await this.create(userId, input, seedKey)
    await this.db
      .delete(tables.dashboardWidgets)
      .where(eq(tables.dashboardWidgets.dashboardId, dashboard.id))
    for (const widget of widgets) {
      await this.addWidget(userId, dashboard.id, widget)
    }
  }

  private summary(row: DashboardRow, widgetCount: number): DashboardSummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      widgetCount,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    }
  }

  private async widgets(dashboardId: string): Promise<Widget[]> {
    const rows = await this.db
      .select({ widget: tables.dashboardWidgets, queryName: tables.savedQueries.name })
      .from(tables.dashboardWidgets)
      .innerJoin(
        tables.savedQueries,
        eq(tables.savedQueries.id, tables.dashboardWidgets.savedQueryId),
      )
      .where(eq(tables.dashboardWidgets.dashboardId, dashboardId))
      .orderBy(asc(tables.dashboardWidgets.createdAt))
    return rows.map(({ widget, queryName }) => this.toWidget(widget, queryName))
  }

  private toWidget(row: WidgetRow, savedQueryName: string): Widget {
    return {
      id: row.id,
      title: row.title,
      kind: row.kind,
      savedQueryId: row.savedQueryId,
      savedQueryName,
      config: row.config,
      position: row.position,
    }
  }

  private async row(userId: string, id: string): Promise<DashboardRow> {
    const row = await this.db.query.dashboards.findFirst({
      where: and(eq(tables.dashboards.id, id), eq(tables.dashboards.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
    return row
  }

  private async assertSavedQuery(userId: string, id: string): Promise<void> {
    const row = await this.db.query.savedQueries.findFirst({
      where: and(eq(tables.savedQueries.id, id), eq(tables.savedQueries.userId, userId)),
    })
    if (!row) {
      throw notFound()
    }
  }

  private async touch(id: string): Promise<void> {
    await this.db
      .update(tables.dashboards)
      .set({ updatedAt: new Date() })
      .where(eq(tables.dashboards.id, id))
  }

  private async widgetCounts(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) {
      return new Map()
    }
    const rows = await this.db
      .select({ id: tables.dashboardWidgets.dashboardId, total: count() })
      .from(tables.dashboardWidgets)
      .where(inArray(tables.dashboardWidgets.dashboardId, ids))
      .groupBy(tables.dashboardWidgets.dashboardId)
    return new Map(rows.map((row) => [row.id, row.total]))
  }
}
