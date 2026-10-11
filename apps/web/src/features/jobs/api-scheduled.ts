"use client"

import {
  API_ROUTES,
  type ScheduledQuery,
  type UpsertScheduledQueryRequest,
  runTriggeredSchema,
  scheduledQueryListSchema,
  scheduledQuerySchema,
  scheduledRunListSchema,
} from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { z } from "zod"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

type ScheduledQueryList = z.infer<typeof scheduledQueryListSchema>

export const scheduledQueryKeys = {
  all: [QUERY_ROOTS.scheduledQueries] as const,
  list: () => [QUERY_ROOTS.scheduledQueries, "list"] as const,
  detail: (id: string) => [QUERY_ROOTS.scheduledQueries, "detail", id] as const,
  runs: (id: string) => [QUERY_ROOTS.scheduledQueries, "runs", id] as const,
}

export function toUpsertScheduleBody(
  schedule: ScheduledQuery,
  overrides: Partial<UpsertScheduledQueryRequest> = {},
): UpsertScheduledQueryRequest {
  return {
    name: schedule.name,
    savedQueryId: schedule.savedQueryId,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    isEnabled: schedule.isEnabled,
    ...overrides,
  }
}

export function useScheduledQueries() {
  return useQuery({
    queryKey: scheduledQueryKeys.list(),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.scheduledQueries.collection.build(),
        scheduledQueryListSchema,
        undefined,
        signal,
      ),
  })
}

export function useScheduledRuns(id: string | null) {
  return useQuery({
    queryKey: scheduledQueryKeys.runs(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.scheduledQueries.runs.build({ id: id ?? "" }),
        scheduledRunListSchema,
        undefined,
        signal,
      ),
    enabled: Boolean(id),
  })
}

function replaceInList(list: ScheduledQueryList | undefined, schedule: ScheduledQuery) {
  if (!list) {
    return list
  }
  return { items: list.items.map((item) => (item.id === schedule.id ? schedule : item)) }
}

export function useCreateScheduledQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertScheduledQueryRequest) =>
      api.post(API_ROUTES.scheduledQueries.collection.build(), scheduledQuerySchema, body),
    onSuccess: (schedule) => {
      queryClient.setQueryData(scheduledQueryKeys.detail(schedule.id), schedule)
      void queryClient.invalidateQueries({ queryKey: scheduledQueryKeys.list() })
    },
  })
}

export function useUpdateScheduledQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpsertScheduledQueryRequest }) =>
      api.put(API_ROUTES.scheduledQueries.item.build({ id }), scheduledQuerySchema, body),
    onSuccess: (schedule) => {
      queryClient.setQueryData(scheduledQueryKeys.detail(schedule.id), schedule)
      queryClient.setQueryData<ScheduledQueryList>(scheduledQueryKeys.list(), (current) =>
        replaceInList(current, schedule),
      )
      void queryClient.invalidateQueries({ queryKey: scheduledQueryKeys.list() })
    },
  })
}

export function useToggleScheduledQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ schedule, isEnabled }: { schedule: ScheduledQuery; isEnabled: boolean }) =>
      api.put(
        API_ROUTES.scheduledQueries.item.build({ id: schedule.id }),
        scheduledQuerySchema,
        toUpsertScheduleBody(schedule, { isEnabled }),
      ),
    onMutate: async ({ schedule, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: scheduledQueryKeys.list() })
      const previous = queryClient.getQueryData<ScheduledQueryList>(scheduledQueryKeys.list())
      queryClient.setQueryData<ScheduledQueryList>(scheduledQueryKeys.list(), (current) =>
        replaceInList(current, { ...schedule, isEnabled }),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(scheduledQueryKeys.list(), context.previous)
      }
    },
    onSuccess: (schedule) => {
      queryClient.setQueryData<ScheduledQueryList>(scheduledQueryKeys.list(), (current) =>
        replaceInList(current, schedule),
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: scheduledQueryKeys.list() })
    },
  })
}

export function useDeleteScheduledQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(API_ROUTES.scheduledQueries.item.build({ id })),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: scheduledQueryKeys.detail(id) })
      queryClient.removeQueries({ queryKey: scheduledQueryKeys.runs(id) })
      void queryClient.invalidateQueries({ queryKey: scheduledQueryKeys.list() })
    },
  })
}

export function useRunScheduledQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(API_ROUTES.scheduledQueries.run.build({ id }), runTriggeredSchema),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: scheduledQueryKeys.runs(id) })
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.jobs] })
    },
  })
}
