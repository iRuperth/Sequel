"use client"

import {
  API_ROUTES,
  activityListSchema,
  progressSummarySchema,
  skillListSchema,
} from "@sequel/contracts"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const progressKeys = {
  all: [QUERY_ROOTS.progress] as const,
  summary: () => [QUERY_ROOTS.progress, "summary"] as const,
  skills: () => [QUERY_ROOTS.progress, "skills"] as const,
  activity: (days: number) => [QUERY_ROOTS.progress, "activity", days] as const,
}

export function useProgressSummary() {
  return useQuery({
    queryKey: progressKeys.summary(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.progress.summary.build(), progressSummarySchema, undefined, signal),
  })
}

export function useSkills() {
  return useQuery({
    queryKey: progressKeys.skills(),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.progress.skills.build(), skillListSchema, undefined, signal),
    select: (data) => data.items,
  })
}

export function useActivity(days: number) {
  return useQuery({
    queryKey: progressKeys.activity(days),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.progress.activity.build(), activityListSchema, { days }, signal),
    select: (data) => data.items,
  })
}
