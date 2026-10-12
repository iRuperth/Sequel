"use client"

import {
  API_ROUTES,
  type CreateSavedQueryRequest,
  type SavedQuery,
  type SavedQueryListQuery,
  type UpdateSavedQueryRequest,
  savedQueryListSchema,
  savedQuerySchema,
} from "@sequel/contracts"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const savedQueryKeys = {
  all: [QUERY_ROOTS.savedQueries] as const,
  list: (params: SavedQueryListQuery = {}) => [QUERY_ROOTS.savedQueries, "list", params] as const,
  detail: (id: string) => [QUERY_ROOTS.savedQueries, "detail", id] as const,
}

type SavedQueriesOptions = {
  keepPrevious?: boolean
}

export function useSavedQueries(
  params: SavedQueryListQuery = {},
  enabled = true,
  options: SavedQueriesOptions = {},
) {
  return useQuery({
    queryKey: savedQueryKeys.list(params),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.savedQueries.collection.build(), savedQueryListSchema, params, signal),
    enabled,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  })
}

export function useSavedQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: savedQueryKeys.detail(id ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.savedQueries.item.build({ id: id ?? "" }),
        savedQuerySchema,
        undefined,
        signal,
      ),
    enabled: Boolean(id),
  })
}

export function useCreateSavedQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSavedQueryRequest) =>
      api.post(API_ROUTES.savedQueries.collection.build(), savedQuerySchema, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(savedQueryKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.savedQueries, "list"] })
    },
  })
}

export function useUpdateSavedQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSavedQueryRequest }) =>
      api.patch(API_ROUTES.savedQueries.item.build({ id }), savedQuerySchema, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(savedQueryKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.savedQueries, "list"] })
    },
  })
}

export function useDeleteSavedQuery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(API_ROUTES.savedQueries.item.build({ id })),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: savedQueryKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.savedQueries, "list"] })
    },
  })
}

type SavedQueryList = { items: SavedQuery[] }

const savedQueryListRoot = [QUERY_ROOTS.savedQueries, "list"] as const

export function useToggleSavedQueryFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.patch(API_ROUTES.savedQueries.item.build({ id }), savedQuerySchema, { isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: savedQueryListRoot })
      const previous = queryClient.getQueriesData<SavedQueryList>({ queryKey: savedQueryListRoot })
      queryClient.setQueriesData<SavedQueryList>({ queryKey: savedQueryListRoot }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => (item.id === id ? { ...item, isFavorite } : item)),
            }
          : current,
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(savedQueryKeys.detail(saved.id), saved)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: savedQueryListRoot })
    },
  })
}
