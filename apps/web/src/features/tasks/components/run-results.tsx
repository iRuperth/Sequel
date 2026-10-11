"use client"

import type { ExecuteQueryResponse } from "@sequel/contracts"
import { copy, executionStatusLabels, interpolate } from "@sequel/copy"
import { CircleCheck, Play } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/error-state"
import { KeyCombo } from "@/components/ui/kbd"
import { IndeterminateBar } from "@/components/ui/spinner"
import { ResultGrid } from "@/features/results/components/result-grid"
import { usePreferences } from "@/features/settings/api"
import { formatDuration, formatInteger } from "@/lib/format"
import { useKeyLabels } from "@/lib/hooks/use-platform"
import { executionStatusTone } from "@/lib/tones"
import { SqlErrorPanel } from "./sql-error-panel"

export type RunOutcome =
  | { kind: "response"; response: ExecuteQueryResponse; source: string; base: number }
  | { kind: "failure"; error: unknown }

function rowsLabel(count: number): string {
  return count === 1
    ? copy.workbench.statusBar.oneRow
    : interpolate(copy.workbench.statusBar.rows, { count: formatInteger(count) })
}

function ResponseView({
  response,
  source,
  base,
  onReveal,
}: {
  response: ExecuteQueryResponse
  source: string
  base: number
  onReveal: (offset: number) => void
}) {
  const preferences = usePreferences()
  const [pageSize, setPageSize] = useState<number | null>(null)
  const { execution, result, error } = response
  const summary = (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-fg-muted">
      <Badge tone={executionStatusTone[execution.status]} dot>
        {executionStatusLabels[execution.status]}
      </Badge>
      {result ? (
        <span className="font-mono tabular">
          {interpolate(copy.tasks.results.summary, {
            rows: rowsLabel(result.rowCount),
            duration: formatDuration(execution.durationMs),
          })}
        </span>
      ) : (
        <span className="font-mono tabular">{formatDuration(execution.durationMs)}</span>
      )}
    </div>
  )
  if (error) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {summary}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <SqlErrorPanel error={error} sql={source} base={base} onReveal={onReveal} />
        </div>
      </div>
    )
  }
  if (!result) {
    return summary
  }
  if (result.columns.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {summary}
        <div className="flex items-center gap-2 p-4 text-sm text-fg">
          <CircleCheck className="size-4 text-success" />
          {result.commandTag
            ? interpolate(copy.results.commandCompleted, { tag: result.commandTag })
            : copy.results.statementCompleted}
          {result.affectedRows !== null ? (
            <span className="text-fg-muted">
              {interpolate(copy.results.affectedRows, {
                count: formatInteger(result.affectedRows),
              })}
            </span>
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      {summary}
      <ResultGrid
        result={result}
        pageSize={pageSize ?? preferences.resultPageSize}
        onPageSizeChange={setPageSize}
        className="min-h-0 flex-1"
      />
    </div>
  )
}

export function RunResults({
  running,
  outcome,
  onReveal,
}: {
  running: boolean
  outcome: RunOutcome | null
  onReveal: (offset: number) => void
}) {
  const keys = useKeyLabels()
  if (running) {
    return (
      <div className="flex flex-col">
        <IndeterminateBar />
        <p className="px-4 py-3 text-sm text-fg-muted">{copy.results.running}</p>
      </div>
    )
  }
  if (!outcome) {
    return (
      <EmptyState
        compact
        icon={Play}
        title={copy.results.empty.title}
        description={
          <span className="flex flex-col items-center gap-2">
            <span>{copy.tasks.results.emptyDescription}</span>
            <KeyCombo keys={[keys.mod, keys.enter]} />
          </span>
        }
        className="h-full"
      />
    )
  }
  if (outcome.kind === "failure") {
    return (
      <div className="p-4">
        <InlineError error={outcome.error} />
      </div>
    )
  }
  return (
    <ResponseView
      response={outcome.response}
      source={outcome.source}
      base={outcome.base}
      onReveal={onReveal}
    />
  )
}
