"use client"

import { API_ROUTES, schemaTreeSchema } from "@sequel/contracts"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

const SCHEMA_STALE_MS = 120_000

export const schemaKeys = {
  all: [QUERY_ROOTS.schema] as const,
  tree: () => [QUERY_ROOTS.schema, "tree"] as const,
}

export function useSchemaTree() {
  return useQuery({
    queryKey: schemaKeys.tree(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.schema.build(), schemaTreeSchema, undefined, signal),
    staleTime: SCHEMA_STALE_MS,
  })
}
