"use client"

import {
  API_ROUTES,
  type QualityCheck,
  type UpsertQualityCheckRequest,
  qualityCheckListSchema,
  qualityCheckSchema,
  qualityOverviewSchema,
  qualityRunListSchema,
  runTriggeredSchema,
} from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { z } from "zod"
import { UI_TIMING } from "@/config/constants"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"
import { toUpsertCheckBody } from "./model/check-form"

type QualityCheckList = z.infer<typeof qualityCheckListSchema>

export const qualityKeys = {
  all: [QUERY_ROOTS.qualityChecks] as const,
  list: () => [QUERY_ROOTS.qualityChecks, "list"] as const,
  overview: () => [QUERY_ROOTS.qualityChecks, "overview"] as const,
  detail: (id: string) => [QUERY_ROOTS.qualityChecks, "detail", id] as const,
  runs: (id: string) => [QUERY_ROOTS.qualityChecks, "runs", id] as const,
}

export function useQualityChecks() {
  return useQuery({
    queryKey: qualityKeys.list(),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.qualityChecks.collection.build(),
        qualityCheckListSchema,
        undefined,
        signal,
      ),
    refetchInterval: UI_TIMING.qualityRefetchMs,
  })
}

export function useQualityOverview() {
  return useQuery({
    queryKey: qualityKeys.overview(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.qualityChecks.overview.build(), qualityOverviewSchema, undefined, signal),
    refetchInterval: UI_TIMING.qualityRefetchMs,
  })
}

export function useQualityRuns(id: string | null) {
  return useQuery({
    queryKey: qualityKeys.runs(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.qualityChecks.runs.build({ id: id ?? "" }),
        qualityRunListSchema,
        undefined,
        signal,
      ),
    enabled: Boolean(id),
  })
}

function replaceInList(list: QualityCheckList | undefined, check: QualityCheck) {
  if (!list) {
    return list
  }
  return { items: list.items.map((item) => (item.id === check.id ? check : item)) }
}

function invalidateSummary(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: qualityKeys.list() })
  void queryClient.invalidateQueries({ queryKey: qualityKeys.overview() })
}

export function useCreateQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertQualityCheckRequest) =>
      api.post(API_ROUTES.qualityChecks.collection.build(), qualityCheckSchema, body),
    onSuccess: (check) => {
      queryClient.setQueryData(qualityKeys.detail(check.id), check)
      invalidateSummary(queryClient)
    },
  })
}

export function useUpdateQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpsertQualityCheckRequest }) =>
      api.put(API_ROUTES.qualityChecks.item.build({ id }), qualityCheckSchema, body),
    onSuccess: (check) => {
      queryClient.setQueryData(qualityKeys.detail(check.id), check)
      queryClient.setQueryData<QualityCheckList>(qualityKeys.list(), (current) =>
        replaceInList(current, check),
      )
      invalidateSummary(queryClient)
    },
  })
}

export function useToggleQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ check, isEnabled }: { check: QualityCheck; isEnabled: boolean }) =>
      api.put(
        API_ROUTES.qualityChecks.item.build({ id: check.id }),
        qualityCheckSchema,
        toUpsertCheckBody(check, { isEnabled }),
      ),
    onMutate: async ({ check, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: qualityKeys.list() })
      const previous = queryClient.getQueryData<QualityCheckList>(qualityKeys.list())
      queryClient.setQueryData<QualityCheckList>(qualityKeys.list(), (current) =>
        replaceInList(current, { ...check, isEnabled }),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qualityKeys.list(), context.previous)
      }
    },
    onSuccess: (check) => {
      queryClient.setQueryData<QualityCheckList>(qualityKeys.list(), (current) =>
        replaceInList(current, check),
      )
    },
    onSettled: () => invalidateSummary(queryClient),
  })
}

export function useDeleteQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(API_ROUTES.qualityChecks.item.build({ id })),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: qualityKeys.detail(id) })
      queryClient.removeQueries({ queryKey: qualityKeys.runs(id) })
      invalidateSummary(queryClient)
    },
  })
}

export function useRunQualityCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(API_ROUTES.qualityChecks.run.build({ id }), runTriggeredSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.jobs] })
    },
  })
}
