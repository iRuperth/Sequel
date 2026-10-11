"use client"

import {
  API_ROUTES,
  type UpsertWidgetRequest,
  type createDashboardRequestSchema,
  dashboardDataSchema,
  dashboardListSchema,
  dashboardSchema,
  type updateDashboardRequestSchema,
  widgetSchema,
} from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { z } from "zod"
import { executeQuery } from "@/features/workbench/api"
import { ApiError, api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"
import { COLUMN_PROBE_STALE_MS } from "./model/constants"
import { type ColumnOption, toColumnOptions } from "./model/widget-data"

export type CreateDashboardRequest = z.input<typeof createDashboardRequestSchema>
export type UpdateDashboardRequest = z.input<typeof updateDashboardRequestSchema>

const REFRESH_QUERY_PARAM = "refresh"

export const dashboardKeys = {
  all: [QUERY_ROOTS.dashboards] as const,
  list: () => [QUERY_ROOTS.dashboards, "list"] as const,
  detail: (id: string) => [QUERY_ROOTS.dashboards, "detail", id] as const,
  data: (id: string) => [QUERY_ROOTS.dashboards, "data", id] as const,
  columns: (savedQueryId: string) => [QUERY_ROOTS.dashboards, "columns", savedQueryId] as const,
}

function fetchDashboardData(id: string, refresh: boolean, signal?: AbortSignal) {
  return api.get(
    API_ROUTES.dashboards.data.build({ id }),
    dashboardDataSchema,
    refresh ? { [REFRESH_QUERY_PARAM]: true } : undefined,
    signal,
  )
}

export function useDashboards() {
  return useQuery({
    queryKey: dashboardKeys.list(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.dashboards.collection.build(), dashboardListSchema, undefined, signal),
  })
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.dashboards.item.build({ id }), dashboardSchema, undefined, signal),
  })
}

export function useDashboardData(id: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.data(id),
    queryFn: ({ signal }) => fetchDashboardData(id, false, signal),
    enabled,
  })
}

export function useRefreshDashboardData(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => fetchDashboardData(id, true),
    onSuccess: (data) => {
      queryClient.setQueryData(dashboardKeys.data(id), data)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.history] })
    },
  })
}

function invalidateDashboard(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.detail(id) })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.data(id) })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.list() })
}

export function useCreateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDashboardRequest) =>
      api.post(API_ROUTES.dashboards.collection.build(), dashboardSchema, body),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(dashboardKeys.detail(dashboard.id), dashboard)
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.list() })
    },
  })
}

export function useUpdateDashboard(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateDashboardRequest) =>
      api.patch(API_ROUTES.dashboards.item.build({ id }), dashboardSchema, body),
    onSuccess: (dashboard) => {
      queryClient.setQueryData(dashboardKeys.detail(id), dashboard)
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.list() })
    },
  })
}

export function useDeleteDashboard(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(API_ROUTES.dashboards.item.build({ id })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: dashboardKeys.detail(id) })
      queryClient.removeQueries({ queryKey: dashboardKeys.data(id) })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.list() })
    },
  })
}

export function useCreateWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertWidgetRequest) =>
      api.post(API_ROUTES.dashboards.widgets.build({ id: dashboardId }), widgetSchema, body),
    onSuccess: () => invalidateDashboard(queryClient, dashboardId),
  })
}

export function useUpdateWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ widgetId, body }: { widgetId: string; body: UpsertWidgetRequest }) =>
      api.put(
        API_ROUTES.dashboards.widget.build({ id: dashboardId, widgetId }),
        widgetSchema,
        body,
      ),
    onSuccess: () => invalidateDashboard(queryClient, dashboardId),
  })
}

export function useDeleteWidget(dashboardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (widgetId: string) =>
      api.delete(API_ROUTES.dashboards.widget.build({ id: dashboardId, widgetId })),
    onSuccess: () => invalidateDashboard(queryClient, dashboardId),
  })
}

async function probeColumns(sql: string): Promise<ColumnOption[]> {
  const response = await executeQuery({ sql, mode: "read" })
  if (!response.result) {
    throw new ApiError({
      kind: "problem",
      message: response.error?.message ?? response.execution.status,
      code: "sql_error",
    })
  }
  return toColumnOptions(response.result)
}

export function useSavedQueryColumns(savedQueryId: string | null, sql: string | null) {
  return useQuery({
    queryKey: dashboardKeys.columns(savedQueryId ?? ""),
    queryFn: () => probeColumns(sql ?? ""),
    enabled: Boolean(savedQueryId && sql),
    staleTime: COLUMN_PROBE_STALE_MS,
    retry: false,
  })
}
