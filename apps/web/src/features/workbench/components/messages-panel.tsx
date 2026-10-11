"use client"

import { type ExecutionSummary, type SqlError } from "@sequel/contracts"
import { copy, executionStatusLabels, interpolate, rejectionReasonLabels } from "@sequel/copy"
import { CircleCheck, CircleX, CornerDownLeft, Info, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { describeError } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { formatDate, formatDuration, formatInteger } from "@/lib/format"
import type { WorksheetRun } from "../model/run-store"

function MessageRow({
  tone,
  time,
  children,
}: {
  tone: "success" | "danger" | "warning" | "info"
  time: number | null
  children: ReactNode
}) {
  const Icon =
    tone === "success"
      ? CircleCheck
      : tone === "danger"
        ? CircleX
        : tone === "warning"
          ? TriangleAlert
          : Info
  return (
    <div className="flex gap-3 border-b border-border/70 px-3 py-2.5">
      <span className="w-[72px] shrink-0 pt-px font-mono text-2xs text-fg-subtle tabular">
        {time ? formatDate(time, "timeSeconds") : null}
      </span>
      <Icon
        className={cn(
          "mt-0.5 size-3.5 shrink-0",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          tone === "info" && "text-accent-2",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
    </div>
  )
}

function ExecutionMeta({ execution }: { execution: ExecutionSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-subtle">
      <span>{executionStatusLabels[execution.status]}</span>
      <span className="font-mono">{formatDuration(execution.durationMs)}</span>
      {execution.statementCount > 1 ? (
        <span>
          {interpolate(copy.workbench.statusBar.statements, { count: execution.statementCount })}
        </span>
      ) : null}
      <span className="flex items-center gap-1">
        {copy.results.messages.executionId}
        <span className="font-mono">{execution.id}</span>
        <CopyButton value={execution.id} className="size-5" />
      </span>
    </div>
  )
}

function SqlErrorMessage({
  error,
  location,
  onReveal,
}: {
  error: SqlError
  location: WorksheetRun["errorLocation"]
  onReveal: (offset: number) => void
}) {
  return (
    <>
      <p className="font-mono text-xs break-words whitespace-pre-wrap text-danger">
        {error.rejectionReason ? rejectionReasonLabels[error.rejectionReason] : error.message}
      </p>
      {error.rejectionReason && error.message ? (
        <p className="font-mono text-xs break-words text-fg-muted">{error.message}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-muted">
        {error.sqlState ? (
          <span>
            {copy.results.messages.sqlState}{" "}
            <span className="font-mono text-fg">{error.sqlState}</span>
          </span>
        ) : null}
        {error.statementIndex !== null ? (
          <span>
            {interpolate(copy.results.messages.statement, { index: error.statementIndex + 1 })}
          </span>
        ) : null}
        {location ? (
          <>
            <span className="font-mono">
              {interpolate(copy.results.messages.position, {
                line: location.line,
                column: location.column,
              })}
            </span>
            <Button
              variant="link"
              size="xs"
              className="text-2xs"
              onClick={() => onReveal(location.offset)}
            >
              <CornerDownLeft />
              {copy.results.messages.showInEditor}
            </Button>
          </>
        ) : null}
      </div>
      {error.hint ? (
        <p className="text-xs text-fg">
          <span className="text-fg-muted">{copy.results.messages.hint}</span> {error.hint}
        </p>
      ) : null}
      {error.detail ? (
        <p className="text-xs text-fg">
          <span className="text-fg-muted">{copy.results.messages.detail}</span>{" "}
          <span className="font-mono">{error.detail}</span>
        </p>
      ) : null}
    </>
  )
}

export function MessagesPanel({
  run,
  onReveal,
}: {
  run: WorksheetRun
  onReveal: (offset: number) => void
}) {
  const time = run.finishedAt
  if (run.requestError) {
    const described = describeError(run.requestError)
    return (
      <div className="h-full overflow-auto">
        <MessageRow tone="danger" time={time}>
          <p className="text-sm text-danger">{described.message}</p>
          {described.detail ? (
            <p className="font-mono text-xs break-words text-fg-muted">{described.detail}</p>
          ) : null}
        </MessageRow>
      </div>
    )
  }
  const response = run.lastKind === "explain" ? run.explain : run.execution
  if (!response) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-muted">
        {copy.results.messages.empty}
      </div>
    )
  }
  const { execution, error } = response
  const result = run.lastKind === "execute" && run.execution ? run.execution.result : null
  return (
    <div className="h-full overflow-auto">
      {error ? (
        <MessageRow tone={error.rejectionReason ? "warning" : "danger"} time={time}>
          <SqlErrorMessage error={error} location={run.errorLocation} onReveal={onReveal} />
          <ExecutionMeta execution={execution} />
        </MessageRow>
      ) : (
        <MessageRow tone="success" time={time}>
          <p className="text-sm text-fg">
            {interpolate(copy.results.messages.succeeded, {
              duration: formatDuration(execution.durationMs),
            })}
          </p>
          {result ? (
            <p className="text-xs text-fg-muted">
              {result.columns.length > 0
                ? interpolate(copy.workbench.statusBar.rows, {
                    count: formatInteger(result.rowCount),
                  })
                : result.affectedRows !== null
                  ? interpolate(copy.results.affectedRows, {
                      count: formatInteger(result.affectedRows),
                    })
                  : result.commandTag}
            </p>
          ) : null}
          <ExecutionMeta execution={execution} />
        </MessageRow>
      )}
      {result?.truncated ? (
        <MessageRow tone="warning" time={time}>
          <p className="text-xs text-fg">
            {interpolate(copy.results.truncated, { count: formatInteger(result.rowCount) })}
          </p>
        </MessageRow>
      ) : null}
    </div>
  )
}
