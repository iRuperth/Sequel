"use client"

import { API_ROUTES, JOB_EVENT_NAMES, type JobSnapshot, jobSnapshotSchema } from "@sequel/contracts"
import { type QueryKey, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { publicConfig } from "@/config/public"
import { apiUrl } from "@/lib/api-client"
import { openEventStream } from "@/lib/sse"
import { fetchJob, jobKeys } from "../api"
import { JOB_INVALIDATIONS, isTerminalJobStatus } from "./invalidation"

export type JobTransport = "stream" | "polling"

type UseJobOptions = {
  invalidate?: readonly QueryKey[]
  onSettled?: (snapshot: JobSnapshot) => void
}

const STREAM_EVENTS = [JOB_EVENT_NAMES.snapshot, JOB_EVENT_NAMES.heartbeat] as const

export function useJob(jobId: string | null | undefined, options: UseJobOptions = {}) {
  const queryClient = useQueryClient()
  const [pollingJobId, setPollingJobId] = useState<string | null>(null)
  const transport: JobTransport = jobId && pollingJobId === jobId ? "polling" : "stream"
  const settledRef = useRef<string | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const query = useQuery({
    queryKey: jobKeys.detail(jobId ?? ""),
    queryFn: ({ signal }) => fetchJob(jobId ?? "", signal),
    enabled: Boolean(jobId) && transport === "polling",
    refetchInterval: (current) =>
      isTerminalJobStatus(current.state.data?.status) ? false : publicConfig.jobPollIntervalMs,
    retry: false,
  })

  useEffect(() => {
    if (!jobId || transport !== "stream") {
      return
    }
    const cached = queryClient.getQueryData<JobSnapshot>(jobKeys.detail(jobId))
    if (isTerminalJobStatus(cached?.status)) {
      return
    }
    let closed = false
    let close: () => void = () => undefined
    close = openEventStream(apiUrl(API_ROUTES.jobs.events.build({ id: jobId })), STREAM_EVENTS, {
      onEvent: (name, data) => {
        if (name !== JOB_EVENT_NAMES.snapshot) {
          return
        }
        let payload: unknown
        try {
          payload = JSON.parse(data)
        } catch {
          return
        }
        const parsed = jobSnapshotSchema.safeParse(payload)
        if (!parsed.success) {
          return
        }
        queryClient.setQueryData(jobKeys.detail(jobId), parsed.data)
        if (isTerminalJobStatus(parsed.data.status)) {
          closed = true
          close()
        }
      },
      onError: () => {
        if (closed) {
          return
        }
        closed = true
        close()
        setPollingJobId(jobId)
      },
    })
    return () => {
      closed = true
      close()
    }
  }, [jobId, transport, queryClient])

  const snapshot = query.data ?? null
  const terminal = isTerminalJobStatus(snapshot?.status)

  useEffect(() => {
    if (!jobId || !snapshot || !terminal || settledRef.current === jobId) {
      return
    }
    settledRef.current = jobId
    for (const root of JOB_INVALIDATIONS[snapshot.kind]) {
      void queryClient.invalidateQueries({ queryKey: [root] })
    }
    for (const key of optionsRef.current.invalidate ?? []) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
    optionsRef.current.onSettled?.(snapshot)
  }, [jobId, snapshot, terminal, queryClient])

  return {
    snapshot,
    isTerminal: terminal,
    isRunning: Boolean(jobId) && !terminal,
    transport,
    error: query.error,
  }
}
