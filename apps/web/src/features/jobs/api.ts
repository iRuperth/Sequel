"use client"

import { API_ROUTES, type JobListQuery, jobListSchema, jobSnapshotSchema } from "@sequel/contracts"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const jobKeys = {
  all: [QUERY_ROOTS.jobs] as const,
  list: (query: JobListQuery) => [QUERY_ROOTS.jobs, "list", query] as const,
  detail: (id: string) => [QUERY_ROOTS.jobs, "detail", id] as const,
}

export function fetchJob(id: string, signal?: AbortSignal) {
  return api.get(API_ROUTES.jobs.item.build({ id }), jobSnapshotSchema, undefined, signal)
}

export function useJobs(query: JobListQuery, refetchInterval?: number | false) {
  return useQuery({
    queryKey: jobKeys.list(query),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.jobs.collection.build(), jobListSchema, query, signal),
    refetchInterval,
  })
}
