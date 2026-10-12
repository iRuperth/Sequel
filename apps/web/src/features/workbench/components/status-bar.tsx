"use client"

import type { InteractiveExecutionMode } from "@sequel/contracts"
import { copy, executionModeLabels, executionStatusLabels, interpolate } from "@sequel/copy"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import type { SqlEditorCursor } from "@/features/editor/components/sql-editor"
import { cn } from "@/lib/cn"
import { formatDuration, formatInteger } from "@/lib/format"
import { type Tone, executionStatusTone } from "@/lib/tones"
import type { WorksheetRun } from "../model/run-store"
import { useElapsed } from "../model/use-elapsed"

type StatusBarProps = {
  run: WorksheetRun
  cursor: SqlEditorCursor | null
  mode: InteractiveExecutionMode
  database: string | null
  scratchSchema: string | null
}

function Segment({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 whitespace-nowrap", className)}>{children}</span>
  )
}

export function StatusBar({ run, cursor, mode, database, scratchSchema }: StatusBarProps) {
  const running = run.phase !== "idle"
  const elapsed = useElapsed(run.startedAt, running)
  const response = run.lastKind === "explain" ? run.explain : run.execution
  const summary = response?.execution ?? null
  const result = run.lastKind === "execute" ? (run.execution?.result ?? null) : null

  let tone: Tone = "neutral"
  let label: string = copy.workbench.statusBar.idle
  if (run.phase === "cancelling") {
    tone = "warning"
    label = copy.workbench.statusBar.cancelling
  } else if (running) {
    tone = "info"
    label =
      run.kind === "explain"
        ? copy.workbench.statusBar.explaining
        : copy.workbench.statusBar.running
  } else if (run.requestError) {
    tone = "danger"
    label = executionStatusLabels.failed
  } else if (summary) {
    tone = executionStatusTone[summary.status]
    label = executionStatusLabels[summary.status]
  }

  return (
    <div
      role="status"
      aria-label={copy.workbench.statusBar.label}
      className="flex h-6 shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-3 text-2xs text-fg-muted"
    >
      <div className="flex min-w-0 items-center gap-4">
        <Segment>
          <StatusDot tone={tone} pulse={running} className="size-1.5" />
          <span className="text-fg">{label}</span>
        </Segment>
        {running ? (
          <Segment className="font-mono tabular">{formatDuration(elapsed)}</Segment>
        ) : summary ? (
          <>
            <Segment className="font-mono tabular">{formatDuration(summary.durationMs)}</Segment>
            {result && result.columns.length > 0 ? (
              <Segment className="font-mono tabular">
                {result.rowCount === 1
                  ? copy.workbench.statusBar.oneRow
                  : interpolate(copy.workbench.statusBar.rows, {
                      count: formatInteger(result.rowCount),
                    })}
              </Segment>
            ) : result?.affectedRows !== null && result?.affectedRows !== undefined ? (
              <Segment className="font-mono tabular">
                {interpolate(copy.workbench.statusBar.affected, {
                  count: formatInteger(result.affectedRows),
                })}
              </Segment>
            ) : null}
            {result?.truncated ? (
              <Badge tone="warning" className="h-4 px-1 text-2xs">
                {copy.common.truncated}
              </Badge>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {cursor ? (
          <Segment className="font-mono tabular">
            {interpolate(copy.workbench.statusBar.cursor, {
              line: cursor.line,
              column: cursor.column,
            })}
          </Segment>
        ) : null}
        <Segment>
          <span className="text-fg-subtle">{copy.workbench.statusBar.mode}</span>
          <span className={cn(mode === "scratch" ? "text-warning" : "text-fg")}>
            {executionModeLabels[mode]}
          </span>
          {mode === "scratch" && scratchSchema ? (
            <span className="font-mono">{scratchSchema}</span>
          ) : null}
        </Segment>
        {database ? (
          <Segment>
            <span className="text-fg-subtle">{copy.workbench.statusBar.database}</span>
            <span className="font-mono text-fg">{database}</span>
          </Segment>
        ) : null}
      </div>
    </div>
  )
}
