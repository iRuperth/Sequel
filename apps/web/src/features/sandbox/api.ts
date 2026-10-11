"use client"

import { API_ROUTES, sandboxSessionResponseSchema } from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const sandboxKeys = {
  all: [QUERY_ROOTS.sandbox] as const,
  session: () => [QUERY_ROOTS.sandbox, "session"] as const,
}

export function useSandboxSession(enabled = true) {
  return useQuery({
    queryKey: sandboxKeys.session(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.sandbox.session.build(), sandboxSessionResponseSchema, undefined, signal),
    enabled,
  })
}

export function useEnsureSandboxSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(API_ROUTES.sandbox.session.build(), sandboxSessionResponseSchema),
    onSuccess: (response) => {
      queryClient.setQueryData(sandboxKeys.session(), response)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.schema] })
    },
  })
}

export function useResetSandboxSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(API_ROUTES.sandbox.reset.build(), sandboxSessionResponseSchema),
    onSuccess: (response) => {
      queryClient.setQueryData(sandboxKeys.session(), response)
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.schema] })
    },
  })
}
