"use client"

import {
  API_ROUTES,
  type ExecuteQueryRequest,
  type ExplainRequest,
  cancelQueryResponseSchema,
  datasetListSchema,
  executeQueryResponseSchema,
  explainResponseSchema,
} from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export function executeQuery(body: ExecuteQueryRequest) {
  return api.post(API_ROUTES.queries.execute.build(), executeQueryResponseSchema, body)
}

export function explainQuery(body: ExplainRequest) {
  return api.post(API_ROUTES.queries.explain.build(), explainResponseSchema, body)
}

export function cancelQuery(requestId: string) {
  return api.post(API_ROUTES.queries.cancel.build(), cancelQueryResponseSchema, { requestId })
}

export function useExecuteQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: executeQuery,
    onSettled: (response, _error, request) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.history] })
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.progress] })
      if (request.mode === "scratch" && response?.execution.status === "succeeded") {
        void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.sandbox] })
        void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.schema] })
      }
    },
  })
}

export function useExplainQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: explainQuery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.history] })
    },
  })
}

export function useCancelQuery() {
  return useMutation({ mutationFn: cancelQuery })
}

export function useDatasetOptions() {
  return useQuery({
    queryKey: [QUERY_ROOTS.catalog, "datasets"],
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.catalog.datasets.build(), datasetListSchema, undefined, signal),
  })
}
