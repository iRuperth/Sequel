"use client"

import {
  API_ROUTES,
  catalogSearchResultSchema,
  catalogTableDetailSchema,
  datasetDetailSchema,
  datasetListSchema,
  runTriggeredSchema,
} from "@sequel/contracts"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const catalogKeys = {
  all: [QUERY_ROOTS.catalog] as const,
  datasets: () => [QUERY_ROOTS.catalog, "datasets"] as const,
  dataset: (slug: string) => [QUERY_ROOTS.catalog, "dataset", slug] as const,
  table: (schema: string, table: string) => [QUERY_ROOTS.catalog, "table", schema, table] as const,
  search: (term: string) => [QUERY_ROOTS.catalog, "search", term] as const,
}

export function useDatasets(enabled = true) {
  return useQuery({
    queryKey: catalogKeys.datasets(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.catalog.datasets.build(), datasetListSchema, undefined, signal),
    enabled,
  })
}

export function useDataset(slug: string) {
  return useQuery({
    queryKey: catalogKeys.dataset(slug),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.catalog.dataset.build({ slug }), datasetDetailSchema, undefined, signal),
    enabled: slug.length > 0,
  })
}

export function useCatalogTable(schema: string, table: string) {
  return useQuery({
    queryKey: catalogKeys.table(schema, table),
    queryFn: ({ signal }) =>
      api.get(
        API_ROUTES.catalog.table.build({ schema, table }),
        catalogTableDetailSchema,
        undefined,
        signal,
      ),
    enabled: schema.length > 0 && table.length > 0,
  })
}

export function useCatalogSearch(term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: catalogKeys.search(q),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.catalog.search.build(), catalogSearchResultSchema, { q }, signal),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useRefreshCatalog() {
  return useMutation({
    mutationFn: () => api.post(API_ROUTES.catalog.refresh.build(), runTriggeredSchema),
  })
}
