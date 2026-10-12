"use client"

import type { ExecuteQueryResponse, ExplainResponse } from "@sequel/contracts"
import { create } from "zustand"

export type ResultsTab = "results" | "plan" | "messages" | "history"
export type RunPhase = "idle" | "running" | "cancelling"
export type RunKind = "execute" | "explain"

export type ErrorLocation = {
  offset: number
  line: number
  column: number
}

export type WorksheetRun = {
  phase: RunPhase
  kind: RunKind | null
  requestId: string | null
  startedAt: number | null
  finishedAt: number | null
  executedSql: string
  executedOffset: number
  execution: ExecuteQueryResponse | null
  explain: ExplainResponse | null
  requestError: unknown
  errorLocation: ErrorLocation | null
  activeTab: ResultsTab
  lastKind: RunKind | null
}

export const EMPTY_RUN: WorksheetRun = {
  phase: "idle",
  kind: null,
  requestId: null,
  startedAt: null,
  finishedAt: null,
  executedSql: "",
  executedOffset: 0,
  execution: null,
  explain: null,
  requestError: null,
  errorLocation: null,
  activeTab: "results",
  lastKind: null,
}

type RunStore = {
  runs: Record<string, WorksheetRun>
  patch: (id: string, change: Partial<WorksheetRun>) => void
  remove: (id: string) => void
}

export const useRunStore = create<RunStore>((set) => ({
  runs: {},
  patch: (id, change) =>
    set((state) => ({
      runs: { ...state.runs, [id]: { ...(state.runs[id] ?? EMPTY_RUN), ...change } },
    })),
  remove: (id) =>
    set((state) => {
      const next = { ...state.runs }
      delete next[id]
      return { runs: next }
    }),
}))

export function useWorksheetRun(id: string | null | undefined): WorksheetRun {
  return useRunStore((state) => (id ? (state.runs[id] ?? EMPTY_RUN) : EMPTY_RUN))
}

export function getWorksheetRun(id: string): WorksheetRun {
  return useRunStore.getState().runs[id] ?? EMPTY_RUN
}
