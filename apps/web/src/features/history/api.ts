"use client"

import {
  API_ROUTES,
  type HistoryQuery,
  executionDetailSchema,
  historyPageSchema,
} from "@sequel/contracts"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export type HistoryFilters = Omit<HistoryQuery, "cursor">

export const historyKeys = {
  all: [QUERY_ROOTS.history] as const,
  list: (filters: HistoryFilters) => [QUERY_ROOTS.history, "list", filters] as const,
  recent: (filters: HistoryFilters) => [QUERY_ROOTS.history, "recent", filters] as const,
  detail: (id: string) => [QUERY_ROOTS.history, "detail", id] as const,
}

type HistoryInfiniteOptions = {
  keepPrevious?: boolean
}

export function useHistoryInfinite(filters: HistoryFilters, options: HistoryInfiniteOptions = {}) {
  return useInfiniteQuery({
    queryKey: historyKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      api.get(
        API_ROUTES.queries.history.build(),
        historyPageSchema,
        { ...filters, cursor: pageParam ?? undefined },
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  })
}

export function useRecentExecutions(filters: HistoryFilters, enabled = true) {
  return useQuery({
    queryKey: historyKeys.recent(filters),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.queries.history.build(), historyPageSchema, filters, signal),
    enabled,
  })
}

export function useExecutionDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: historyKeys.detail(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.queries.historyDetail.build({ id: id ?? "" }),
        executionDetailSchema,
        undefined,
        signal,
      ),
    enabled: Boolean(id),
  })
}
