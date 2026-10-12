"use client"

import type { InteractiveExecutionMode, SandboxSessionResponse } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { toast } from "@/components/ui/toast"
import { sandboxKeys, useEnsureSandboxSession } from "@/features/sandbox/api"
import { createId } from "@/lib/ids"
import { cancelQuery, useExecuteQuery, useExplainQuery } from "../api"
import { locateError } from "./error-location"
import { type ResultsTab, getWorksheetRun, useRunStore } from "./run-store"

export type RunRequest = {
  worksheetId: string
  sql: string
  offset: number
  document: string
  mode: InteractiveExecutionMode
}

function nextTabForExecute(current: ResultsTab): ResultsTab {
  return current === "messages" || current === "results" ? current : "results"
}

export function useWorkbenchRunner() {
  const executeMutation = useExecuteQuery()
  const explainMutation = useExplainQuery()
  const ensureSession = useEnsureSandboxSession()
  const patch = useRunStore((state) => state.patch)
  const queryClient = useQueryClient()
  const { mutateAsync: execute } = executeMutation
  const { mutateAsync: explain } = explainMutation
  const { mutateAsync: ensure } = ensureSession

  const run = useCallback(
    async ({ worksheetId, sql, offset, document, mode }: RunRequest) => {
      if (!sql.trim()) {
        toast.info(copy.workbench.notices.emptyQuery)
        return
      }
      const current = getWorksheetRun(worksheetId)
      if (current.phase !== "idle") {
        return
      }
      const requestId = createId()
      patch(worksheetId, {
        phase: "running",
        kind: "execute",
        requestId,
        startedAt: Date.now(),
        finishedAt: null,
        executedSql: sql,
        executedOffset: offset,
        errorLocation: null,
        requestError: null,
        activeTab: nextTabForExecute(current.activeTab),
      })
      try {
        const cached = queryClient.getQueryData<SandboxSessionResponse>(sandboxKeys.session())
        if (mode === "scratch" && cached?.session?.status !== "active") {
          await ensure()
        }
        const response = await execute({ sql, mode, requestId })
        patch(worksheetId, {
          phase: "idle",
          finishedAt: Date.now(),
          execution: response,
          lastKind: "execute",
          errorLocation: locateError(document, offset, response.error?.position ?? null),
          activeTab: response.error ? "messages" : "results",
        })
      } catch (error) {
        patch(worksheetId, {
          phase: "idle",
          finishedAt: Date.now(),
          execution: null,
          requestError: error,
          lastKind: "execute",
          activeTab: "messages",
        })
      }
    },
    [ensure, execute, patch, queryClient],
  )

  const runExplain = useCallback(
    async ({ worksheetId, sql, offset, document }: RunRequest, analyze: boolean) => {
      if (!sql.trim()) {
        toast.info(copy.workbench.notices.emptyQuery)
        return
      }
      if (getWorksheetRun(worksheetId).phase !== "idle") {
        return
      }
      patch(worksheetId, {
        phase: "running",
        kind: "explain",
        requestId: null,
        startedAt: Date.now(),
        finishedAt: null,
        executedSql: sql,
        executedOffset: offset,
        errorLocation: null,
        requestError: null,
        activeTab: "plan",
      })
      try {
        const response = await explain({ sql, analyze })
        patch(worksheetId, {
          phase: "idle",
          finishedAt: Date.now(),
          explain: response,
          lastKind: "explain",
          errorLocation: locateError(document, offset, response.error?.position ?? null),
          activeTab: response.error ? "messages" : "plan",
        })
      } catch (error) {
        patch(worksheetId, {
          phase: "idle",
          finishedAt: Date.now(),
          explain: null,
          requestError: error,
          lastKind: "explain",
          activeTab: "messages",
        })
      }
    },
    [explain, patch],
  )

  const cancel = useCallback(
    async (worksheetId: string) => {
      const current = getWorksheetRun(worksheetId)
      if (current.phase !== "running" || !current.requestId) {
        return
      }
      patch(worksheetId, { phase: "cancelling" })
      try {
        await cancelQuery(current.requestId)
      } catch (error) {
        if (getWorksheetRun(worksheetId).phase === "cancelling") {
          patch(worksheetId, { phase: "running" })
        }
        toast.fromError(error, copy.workbench.notices.cancelFailed)
      }
    },
    [patch],
  )

  return { run, explain: runExplain, cancel }
}
