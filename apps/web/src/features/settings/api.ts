"use client"

import {
  API_ROUTES,
  type Preferences,
  type UpdatePreferencesRequest,
  llmStatusSchema,
  preferencesSchema,
  userProfileSchema,
} from "@sequel/contracts"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DEFAULT_PREFERENCES } from "@/config/constants"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

const PROFILE_STALE_MS = 300_000

export const settingsKeys = {
  all: [QUERY_ROOTS.settings] as const,
  preferences: () => [QUERY_ROOTS.settings, "preferences"] as const,
  llm: () => [QUERY_ROOTS.settings, "llm"] as const,
  me: () => [QUERY_ROOTS.me] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: settingsKeys.me(),
    queryFn: ({ signal }) => api.get(API_ROUTES.me.build(), userProfileSchema, undefined, signal),
    staleTime: PROFILE_STALE_MS,
  })
}

export function usePreferencesQuery() {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.settings.preferences.build(), preferencesSchema, undefined, signal),
    staleTime: PROFILE_STALE_MS,
  })
}

export function usePreferences(): Preferences {
  const query = usePreferencesQuery()
  return query.data ?? DEFAULT_PREFERENCES
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdatePreferencesRequest) =>
      api.put(API_ROUTES.settings.preferences.build(), preferencesSchema, patch),
    onSuccess: (preferences) => {
      queryClient.setQueryData(settingsKeys.preferences(), preferences)
    },
  })
}

export function useLlmStatus() {
  return useQuery({
    queryKey: settingsKeys.llm(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.settings.llm.build(), llmStatusSchema, undefined, signal),
  })
}
