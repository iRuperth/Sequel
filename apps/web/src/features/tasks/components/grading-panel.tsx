"use client"

import type { Comparison, Submission, Verdict } from "@sequel/contracts"
import { comparisonNoteLabels, copy, interpolate, verdictLabels } from "@sequel/copy"
import { CircleAlert, CircleCheck, CircleX, ClipboardCheck, Info, ShieldAlert } from "lucide-react"
import type { ReactNode } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { StaticGrid } from "@/features/results/components/static-grid"
import { cn } from "@/lib/cn"
import { formatDuration, formatInteger } from "@/lib/format"
import { toneSoftClass, toneTextClass, verdictTone } from "@/lib/tones"
import { SUBMISSION_SAMPLE_MAX_HEIGHT } from "../model/constants"
import { ReviewPanel } from "./review-panel"
import { SqlErrorPanel } from "./sql-error-panel"

const VERDICT_ICON = {
  pass: CircleCheck,
  fail: CircleAlert,
  error: CircleX,
  rejected: ShieldAlert,
} as const satisfies Record<Verdict, unknown>

function VerdictHeader({ submission, verdict }: { submission: Submission; verdict: Verdict }) {
  const tone = verdictTone[verdict]
  const Icon = VERDICT_ICON[verdict]
  return (
    <div className={cn("flex items-start gap-3 rounded-md px-3.5 py-3", toneSoftClass[tone])}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-md font-semibold">{verdictLabels[verdict]}</span>
        <span className="text-sm text-fg">{copy.tasks.grading.verdictDescriptions[verdict]}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1">
          {copy.tasks.grading.submitted}
          <RelativeTime value={submission.submittedAt} />
        </span>
        {submission.durationMs !== null ? (
          <span className="font-mono tabular">{formatDuration(submission.durationMs)}</span>
        ) : null}
      </div>
    </div>
  )
}

function CompareStat({
  label,
  expected,
  actual,
  mismatch,
}: {
  label: string
  expected: number
  actual: number
  mismatch: boolean
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex items-baseline gap-3 font-mono text-sm tabular">
        <span className="flex items-baseline gap-1">
          <span className="font-sans text-2xs text-fg-subtle">{copy.tasks.grading.expected}</span>
          <span className="text-fg">{formatInteger(expected)}</span>
        </span>
        <span className="flex items-baseline gap-1">
          <span className="font-sans text-2xs text-fg-subtle">{copy.tasks.grading.actual}</span>
          <span className={mismatch ? "text-danger" : "text-fg"}>{formatInteger(actual)}</span>
        </span>
      </div>
    </div>
  )
}

function CountStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={cn("font-mono text-sm tabular", value > 0 ? "text-danger" : "text-fg")}>
        {formatInteger(value)}
      </span>
    </div>
  )
}

function ColumnChips({
  label,
  columns,
  reference,
}: {
  label: string
  columns: readonly string[]
  reference: readonly string[]
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-32 shrink-0 pt-0.5 text-xs text-fg-muted">{label}</span>
      <div className="flex flex-wrap gap-1">
        {columns.length === 0 ? (
          <span className="text-xs text-fg-subtle">{copy.common.none}</span>
        ) : (
          columns.map((column, index) => (
            <span
              key={`${column}-${index}`}
              className={cn(
                "inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-2xs",
                reference.includes(column) ? "bg-surface-2 text-fg" : "bg-danger/14 text-danger",
              )}
            >
              {column}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function SampleRows({
  title,
  hint,
  columns,
  rows,
  tone,
}: {
  title: string
  hint: string
  columns: readonly string[]
  rows: Comparison["sampleMissing"]
  tone: "default" | "danger"
}) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-fg">{title}</span>
        <span className="text-xs text-fg-muted">{hint}</span>
      </div>
      <StaticGrid
        columns={columns.map((name) => ({ name }))}
        rows={rows}
        showTypes={false}
        tone={tone}
        maxHeightClass={SUBMISSION_SAMPLE_MAX_HEIGHT}
      />
    </div>
  )
}

function ComparisonDetails({ comparison }: { comparison: Comparison }) {
  const columnMismatch = comparison.expectedColumns.length !== comparison.actualColumns.length
  const rowMismatch = comparison.expectedRowCount !== comparison.actualRowCount
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-4">
        <CompareStat
          label={copy.tasks.grading.columns}
          expected={comparison.expectedColumns.length}
          actual={comparison.actualColumns.length}
          mismatch={columnMismatch}
        />
        <CompareStat
          label={copy.tasks.grading.rows}
          expected={comparison.expectedRowCount}
          actual={comparison.actualRowCount}
          mismatch={rowMismatch}
        />
        <CountStat label={copy.tasks.grading.missingRows} value={comparison.missingRowCount} />
        <CountStat label={copy.tasks.grading.extraRows} value={comparison.extraRowCount} />
      </div>
      <div className="flex flex-col gap-2">
        <ColumnChips
          label={copy.tasks.grading.expectedColumns}
          columns={comparison.expectedColumns}
          reference={comparison.actualColumns}
        />
        <ColumnChips
          label={copy.tasks.grading.actualColumns}
          columns={comparison.actualColumns}
          reference={comparison.expectedColumns}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="size-3.5 text-fg-subtle" />
          {comparison.orderChecked
            ? copy.tasks.grading.orderChecked
            : copy.tasks.grading.orderNotChecked}
        </span>
        {comparison.firstMismatchIndex !== null ? (
          <span className="font-mono tabular">
            {interpolate(copy.tasks.grading.firstMismatch, {
              row: formatInteger(comparison.firstMismatchIndex + 1),
            })}
          </span>
        ) : null}
      </div>
      {comparison.notes.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-muted">{copy.tasks.grading.notes}</span>
          <ul className="flex flex-col gap-1">
            {comparison.notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-sm text-fg">
                <Info className="mt-0.5 size-3.5 shrink-0 text-accent-2" />
                <span>{comparisonNoteLabels[note]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <SampleRows
        title={copy.tasks.grading.sampleMissing}
        hint={copy.tasks.grading.sampleMissingHint}
        columns={comparison.expectedColumns}
        rows={comparison.sampleMissing}
        tone="default"
      />
      <SampleRows
        title={copy.tasks.grading.sampleExtra}
        hint={copy.tasks.grading.sampleExtraHint}
        columns={comparison.actualColumns}
        rows={comparison.sampleExtra}
        tone="danger"
      />
    </div>
  )
}

export function GradingPanel({
  taskId,
  submission,
  grading,
  feedbackJobId,
  onFeedbackJob,
  onUseSql,
  onReveal,
}: {
  taskId: string
  submission: Submission | null
  grading: ReactNode
  feedbackJobId: string | null
  onFeedbackJob: (jobId: string) => void
  onUseSql: (sql: string) => void
  onReveal?: (offset: number) => void
}) {
  if (grading) {
    return <div className="p-4">{grading}</div>
  }
  if (!submission) {
    return (
      <EmptyState
        compact
        icon={ClipboardCheck}
        title={copy.tasks.grading.emptyTitle}
        description={copy.tasks.grading.emptyDescription}
        className="h-full"
      />
    )
  }
  const verdict = submission.verdict
  return (
    <div className="flex flex-col gap-5 p-4">
      {verdict ? <VerdictHeader submission={submission} verdict={verdict} /> : null}
      {submission.comparison ? <ComparisonDetails comparison={submission.comparison} /> : null}
      {submission.error && (verdict === "error" || verdict === "rejected") ? (
        <div className="flex flex-col gap-2">
          <span className={cn("text-xs font-medium", toneTextClass[verdictTone[verdict]])}>
            {copy.tasks.grading.errorTitle}
          </span>
          <SqlErrorPanel error={submission.error} sql={submission.sqlText} onReveal={onReveal} />
        </div>
      ) : null}
      {submission.status === "graded" ? (
        <div className="border-t border-border pt-4">
          <ReviewPanel
            taskId={taskId}
            submission={submission}
            feedbackJobId={feedbackJobId}
            onFeedbackJob={onFeedbackJob}
            onUseSql={onUseSql}
          />
        </div>
      ) : null}
    </div>
  )
}
