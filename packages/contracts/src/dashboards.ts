import { z } from "zod"
import { idSchema, timestampSchema } from "./common"
import { valueFormatSchema, widgetKindSchema } from "./enums"
import { LIMITS } from "./limits"
import { resultSetSchema, sqlErrorSchema } from "./sql"

export const widgetConfigSchema = z.object({
  xColumn: z.string().nullable(),
  yColumns: z.array(z.string()),
  valueColumn: z.string().nullable(),
  format: valueFormatSchema,
  currency: z.string().nullable(),
})
export type WidgetConfig = z.infer<typeof widgetConfigSchema>

export const widgetPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(LIMITS.widgetGridColumns),
  h: z.number().int().min(1),
})
export type WidgetPosition = z.infer<typeof widgetPositionSchema>

export const widgetSchema = z.object({
  id: idSchema,
  title: z.string(),
  kind: widgetKindSchema,
  savedQueryId: idSchema,
  savedQueryName: z.string(),
  config: widgetConfigSchema,
  position: widgetPositionSchema,
})
export type Widget = z.infer<typeof widgetSchema>

export const dashboardSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  widgetCount: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>

export const dashboardSchema = dashboardSummarySchema.extend({ widgets: z.array(widgetSchema) })
export type Dashboard = z.infer<typeof dashboardSchema>

export const dashboardListSchema = z.object({ items: z.array(dashboardSummarySchema) })

export const createDashboardRequestSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  description: z.string().max(LIMITS.descriptionMaxLength).nullable().optional(),
})
export const updateDashboardRequestSchema = createDashboardRequestSchema.partial()

export const upsertWidgetRequestSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.nameMaxLength),
  kind: widgetKindSchema,
  savedQueryId: idSchema,
  config: widgetConfigSchema,
  position: widgetPositionSchema,
})
export type UpsertWidgetRequest = z.infer<typeof upsertWidgetRequestSchema>

export const widgetParamsSchema = z.object({ id: idSchema, widgetId: idSchema })

export const widgetDataSchema = z.object({
  widgetId: idSchema,
  result: resultSetSchema.nullable(),
  error: sqlErrorSchema.nullable(),
  executedAt: timestampSchema,
  cached: z.boolean(),
})
export type WidgetData = z.infer<typeof widgetDataSchema>

export const dashboardDataSchema = z.object({ items: z.array(widgetDataSchema) })
export type DashboardData = z.infer<typeof dashboardDataSchema>

export const dashboardDataQuerySchema = z.object({ refresh: z.enum(["true", "false"]).optional() })
export type DashboardDataQuery = z.infer<typeof dashboardDataQuerySchema>
