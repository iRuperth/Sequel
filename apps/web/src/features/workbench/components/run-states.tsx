"use client"

import type { ExecuteQueryResponse, SqlError } from "@sequel/contracts"
import { copy, interpolate, rejectionReasonLabels } from "@sequel/copy"
import { CircleCheck, Eye, Play, Square, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KeyCombo } from "@/components/ui/kbd"
import { IndeterminateBar, Spinner } from "@/components/ui/spinner"
import { formatDuration, formatInteger } from "@/lib/format"
import { useKeyLabels } from "@/lib/hooks/use-platform"

export function RunningState({
  label,
  elapsedMs,
  onCancel,
  cancelling,
}: {
  label: string
  elapsedMs: number
  onCancel?: () => void
  cancelling?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <IndeterminateBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner className="size-4 text-accent-2" />
          <span>{label}</span>
          <span className="font-mono text-xs text-fg tabular">{formatDuration(elapsedMs)}</span>
        </div>
        {onCancel ? (
          <Button size="xs" variant="secondary" onClick={onCancel} disabled={cancelling}>
            <Square className="fill-current" />
            {copy.workbench.toolbar.cancel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export type IdleSuggestion = { key: string; label: string; onSelect: () => void }

export function IdleState({
  description,
  suggestions = [],
}: {
  description: string
  suggestions?: readonly IdleSuggestion[]
}) {
  const keys = useKeyLabels()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted">
        <Play className="size-4" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-fg">{copy.results.empty.title}</p>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <KeyCombo keys={[keys.mod, keys.enter]} />
      </span>
      {suggestions.length > 0 ? (
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2 pt-1">
          {suggestions.map((suggestion) => (
            <Button key={suggestion.key} size="xs" variant="outline" onClick={suggestion.onSelect}>
              <Eye />
              <span className="font-mono">{suggestion.label}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function sqlErrorHeadline(error: SqlError): string {
  if (error.rejectionReason) {
    return rejectionReasonLabels[error.rejectionReason]
  }
  return error.message
}

export function ErrorSummary({
  error,
  onShowMessages,
}: {
  error: SqlError
  onShowMessages: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-md bg-danger/12 text-danger">
        <TriangleAlert className="size-4" />
      </div>
      <div className="flex max-w-xl flex-col gap-1">
        <p className="text-sm font-medium text-fg">
          {error.rejectionReason ? copy.results.messages.rejected : copy.results.messages.error}
        </p>
        <p className="font-mono text-xs break-words text-danger">{sqlErrorHeadline(error)}</p>
      </div>
      <Button size="xs" variant="secondary" onClick={onShowMessages}>
        {copy.results.viewMessages}
      </Button>
    </div>
  )
}

export function CommandResult({ response }: { response: ExecuteQueryResponse }) {
  const result = response.result
  const tag = result?.commandTag
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-md bg-success/12 text-success">
        <CircleCheck className="size-4" />
      </div>
      <p className="text-sm font-medium text-fg">
        {tag
          ? interpolate(copy.results.commandCompleted, { tag })
          : copy.results.statementCompleted}
      </p>
      <p className="text-xs text-fg-muted">
        {result?.affectedRows !== null && result?.affectedRows !== undefined
          ? interpolate(copy.results.affectedRows, { count: formatInteger(result.affectedRows) })
          : interpolate(copy.results.messages.succeeded, {
              duration: formatDuration(response.execution.durationMs),
            })}
      </p>
    </div>
  )
}
