"use client"

import { copy, interpolate } from "@sequel/copy"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanView } from "@/features/explain/components/plan-view"
import { ResultGrid } from "@/features/results/components/result-grid"
import { usePreferences } from "@/features/settings/api"
import { ErrorState } from "@/components/ui/error-state"
import { formatCompact } from "@/lib/format"
import { type ResultsTab, type WorksheetRun, useRunStore } from "../model/run-store"
import { useElapsed } from "../model/use-elapsed"
import { HistoryPanel } from "./history-panel"
import { MessagesPanel } from "./messages-panel"
import {
  CommandResult,
  ErrorSummary,
  IdleState,
  type IdleSuggestion,
  RunningState,
} from "./run-states"

type ResultsPanelProps = {
  worksheetId: string
  run: WorksheetRun
  onCancel: () => void
  onReveal: (offset: number) => void
  onLoadSql: (sql: string) => void
  suggestions?: readonly IdleSuggestion[]
}

const TAB_CONTENT_CLASS = "min-h-0 flex-1 data-[state=inactive]:hidden"

export function ResultsPanel({
  worksheetId,
  run,
  onCancel,
  onReveal,
  onLoadSql,
  suggestions = [],
}: ResultsPanelProps) {
  const preferences = usePreferences()
  const [pageSize, setPageSize] = useState<number | null>(null)
  const patch = useRunStore((state) => state.patch)
  const running = run.phase !== "idle"
  const elapsed = useElapsed(run.startedAt, running)
  const execution = run.execution
  const result = execution?.result ?? null
  const executeError = execution?.error ?? null
  const explainError = run.explain?.error ?? null
  const hasMessagesError =
    Boolean(run.requestError) ||
    (run.lastKind === "execute" ? Boolean(executeError) : Boolean(explainError))
  const setTab = (tab: string) => patch(worksheetId, { activeTab: tab as ResultsTab })

  const renderResults = () => {
    if (running && run.kind === "execute") {
      return (
        <RunningState
          label={copy.results.running}
          elapsedMs={elapsed}
          onCancel={onCancel}
          cancelling={run.phase === "cancelling"}
        />
      )
    }
    if (run.requestError && run.lastKind === "execute") {
      return <ErrorState compact error={run.requestError} />
    }
    if (executeError) {
      return <ErrorSummary error={executeError} onShowMessages={() => setTab("messages")} />
    }
    if (execution && result) {
      if (result.columns.length === 0) {
        return <CommandResult response={execution} />
      }
      return (
        <ResultGrid
          key={execution.execution.id}
          result={result}
          pageSize={pageSize ?? preferences.resultPageSize}
          onPageSizeChange={setPageSize}
        />
      )
    }
    return (
      <IdleState
        description={
          suggestions.length > 0
            ? copy.results.empty.suggestionsDescription
            : copy.results.empty.description
        }
        suggestions={suggestions}
      />
    )
  }

  const renderPlan = () => {
    if (running && run.kind === "explain") {
      return <RunningState label={copy.results.explaining} elapsedMs={elapsed} />
    }
    if (run.requestError && run.lastKind === "explain") {
      return <ErrorState compact error={run.requestError} />
    }
    if (explainError) {
      return <ErrorSummary error={explainError} onShowMessages={() => setTab("messages")} />
    }
    if (run.explain?.plan) {
      return <PlanView key={run.explain.execution.id} plan={run.explain.plan} />
    }
    return <IdleState description={copy.explain.empty} />
  }

  return (
    <Tabs
      value={run.activeTab}
      onValueChange={setTab}
      className="flex h-full min-h-0 flex-col bg-surface"
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-2">
        <TabsList className="h-8 border-b-0">
          <TabsTrigger
            value="results"
            count={result && result.columns.length > 0 ? formatCompact(result.rowCount) : undefined}
          >
            {copy.results.tabs.results}
          </TabsTrigger>
          <TabsTrigger value="plan">{copy.results.tabs.plan}</TabsTrigger>
          <TabsTrigger value="messages">
            {copy.results.tabs.messages}
            {hasMessagesError ? <span className="size-1.5 rounded-full bg-danger" /> : null}
          </TabsTrigger>
          <TabsTrigger value="history">{copy.results.tabs.history}</TabsTrigger>
        </TabsList>
        {result && result.columns.length > 0 && !running ? (
          <span className="text-2xs text-fg-subtle">
            {interpolate(copy.results.columnsCount, { count: result.columns.length })}
          </span>
        ) : null}
      </div>
      <TabsContent value="results" className={TAB_CONTENT_CLASS}>
        {renderResults()}
      </TabsContent>
      <TabsContent value="plan" className={TAB_CONTENT_CLASS}>
        {renderPlan()}
      </TabsContent>
      <TabsContent value="messages" className={TAB_CONTENT_CLASS}>
        <MessagesPanel run={run} onReveal={onReveal} />
      </TabsContent>
      <TabsContent value="history" className={TAB_CONTENT_CLASS}>
        <HistoryPanel onLoad={onLoadSql} />
      </TabsContent>
    </Tabs>
  )
}
