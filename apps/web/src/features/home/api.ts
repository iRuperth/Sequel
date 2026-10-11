"use client"

import { API_ROUTES, type TaskStatus, type TaskSummary, taskPageSchema } from "@sequel/contracts"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"

export const HOME_OPEN_STATUSES: readonly TaskStatus[] = ["in_progress", "open"]

export type OpenTasks = {
  items: TaskSummary[]
  total: number
}

export const homeKeys = {
  openTasks: (limit: number) => [QUERY_ROOTS.tasks, "home", "open", limit] as const,
}

function byNewest(left: TaskSummary, right: TaskSummary): number {
  return right.createdAt.localeCompare(left.createdAt)
}

async function fetchOpenTasks(limit: number, signal: AbortSignal): Promise<OpenTasks> {
  const pages = await Promise.all(
    HOME_OPEN_STATUSES.map((status) =>
      api.get(API_ROUTES.tasks.collection.build(), taskPageSchema, { status, limit }, signal),
    ),
  )
  const items = pages.flatMap((page) => [...page.items].sort(byNewest)).slice(0, limit)
  const counts = pages[0]?.counts
  const total = HOME_OPEN_STATUSES.reduce((sum, status) => sum + (counts?.[status] ?? 0), 0)
  return { items, total: Math.max(total, items.length) }
}

export function useOpenTasks(limit: number) {
  return useQuery({
    queryKey: homeKeys.openTasks(limit),
    queryFn: ({ signal }) => fetchOpenTasks(limit, signal),
  })
}
