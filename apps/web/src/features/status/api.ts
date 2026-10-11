"use client"

import { API_ROUTES, platformStatusSchema } from "@sequel/contracts"
import { useQuery } from "@tanstack/react-query"
import { UI_TIMING } from "@/config/constants"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const statusKeys = {
  all: [QUERY_ROOTS.health] as const,
  services: () => [QUERY_ROOTS.health, "services"] as const,
}

export function usePlatformStatus(refetchInterval: number | false = UI_TIMING.healthRefetchMs) {
  return useQuery({
    queryKey: statusKeys.services(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.health.services.build(), platformStatusSchema, undefined, signal),
    refetchInterval,
  })
}
