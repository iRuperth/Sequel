"use client"

import {
  API_ROUTES,
  type GenerateTaskRequest,
  type TaskDetail,
  type TaskHint,
  type TaskListQuery,
  datasetListSchema,
  generateTaskResponseSchema,
  requestFeedbackResponseSchema,
  submissionListSchema,
  submitTaskResponseSchema,
  taskDetailSchema,
  taskHintSchema,
  taskPageSchema,
} from "@sequel/contracts"
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { publicConfig } from "@/config/public"
import { api } from "@/lib/api-client"
import { QUERY_ROOTS } from "@/lib/query-keys"
import { TASK_PAGE_SIZE } from "./model/constants"

export type TaskFilters = Omit<TaskListQuery, "cursor" | "limit">

export const taskKeys = {
  all: [QUERY_ROOTS.tasks] as const,
  lists: () => [QUERY_ROOTS.tasks, "list"] as const,
  list: (filters: TaskFilters) => [QUERY_ROOTS.tasks, "list", filters] as const,
  detail: (id: string) => [QUERY_ROOTS.tasks, "detail", id] as const,
  submissions: (id: string) => [QUERY_ROOTS.tasks, "detail", id, "submissions"] as const,
}

export const datasetsQueryKey = [QUERY_ROOTS.catalog, "datasets"] as const

function needsPolling(task: TaskDetail | undefined): boolean {
  if (!task) {
    return false
  }
  if (task.status === "generating" && !task.generation) {
    return true
  }
  return task.latestSubmission?.feedbackStatus === "queued"
}

export function useTasksInfinite(filters: TaskFilters) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      api.get(
        API_ROUTES.tasks.collection.build(),
        taskPageSchema,
        { ...filters, limit: TASK_PAGE_SIZE, cursor: pageParam ?? undefined },
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    placeholderData: keepPreviousData,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.tasks.item.build({ id }), taskDetailSchema, undefined, signal),
    refetchInterval: (query) =>
      needsPolling(query.state.data) ? publicConfig.jobPollIntervalMs : false,
  })
}

export function useTaskSubmissions(id: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.submissions(id),
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.tasks.submissions.build({ id }), submissionListSchema, undefined, signal),
    enabled,
  })
}

export function useDatasets() {
  return useQuery({
    queryKey: datasetsQueryKey,
    queryFn: ({ signal }) =>
      api.get(API_ROUTES.catalog.datasets.build(), datasetListSchema, undefined, signal),
  })
}

export function saveTaskDraft(id: string, sql: string) {
  return api.putVoid(API_ROUTES.tasks.draft.build({ id }), { sql })
}

export function useGenerateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateTaskRequest) =>
      api.post(API_ROUTES.tasks.generate.build(), generateTaskResponseSchema, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useSaveDraft(id: string) {
  return useMutation({
    mutationFn: (sql: string) => saveTaskDraft(id, sql),
  })
}

export function useSubmitTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sql: string) =>
      api.post(API_ROUTES.tasks.submissions.build({ id }), submitTaskResponseSchema, { sql }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

function patchTask(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  update: (task: TaskDetail) => TaskDetail,
) {
  queryClient.setQueryData<TaskDetail>(taskKeys.detail(id), (current) =>
    current ? update(current) : current,
  )
}

export function useRevealHint(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (position: number) =>
      api.post(API_ROUTES.tasks.revealHint.build({ id, position }), taskHintSchema),
    onSuccess: (hint: TaskHint) => {
      patchTask(queryClient, id, (task) => ({
        ...task,
        hints: task.hints.map((item) => (item.position === hint.position ? hint : item)),
      }))
    },
  })
}

export function useAbandonTask(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(API_ROUTES.tasks.abandon.build({ id }), taskDetailSchema),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(id), task)
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: [QUERY_ROOTS.progress] })
    },
  })
}

export function useRetryGeneration(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(API_ROUTES.tasks.retry.build({ id }), generateTaskResponseSchema),
    onSuccess: ({ jobId }) => {
      patchTask(queryClient, id, (task) => ({
        ...task,
        status: "generating",
        generation: { jobId, status: "queued", error: null },
      }))
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export function useRequestFeedback(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) =>
      api.post(
        API_ROUTES.tasks.feedback.build({ id, submissionId }),
        requestFeedbackResponseSchema,
      ),
    onSuccess: (_response, submissionId) => {
      patchTask(queryClient, id, (task) =>
        task.latestSubmission?.id === submissionId
          ? {
              ...task,
              latestSubmission: {
                ...task.latestSubmission,
                feedbackStatus: "queued",
                feedback: null,
              },
            }
          : task,
      )
      void queryClient.invalidateQueries({ queryKey: taskKeys.submissions(id) })
    },
  })
}
