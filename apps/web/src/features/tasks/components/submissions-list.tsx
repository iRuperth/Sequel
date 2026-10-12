"use client"

import type { Submission } from "@sequel/contracts"
import { copy, feedbackStatusLabels, interpolate } from "@sequel/copy"
import { CornerDownLeft, FileClock } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SkeletonRows } from "@/components/ui/skeleton"
import { SqlCode } from "@/components/ui/sql-code"
import { formatDuration } from "@/lib/format"
import { feedbackStatusTone } from "@/lib/tones"
import { useTaskSubmissions } from "../api"
import { SUBMISSION_SAMPLE_MAX_HEIGHT } from "../model/constants"
import { VerdictBadge } from "./task-badges"

const SKELETON_ROWS = 4

function SubmissionRow({
  submission,
  number,
  onLoad,
}: {
  submission: Submission
  number: number
  onLoad: (sql: string) => void
}) {
  return (
    <AccordionItem value={submission.id}>
      <AccordionTrigger className="gap-3 py-2 font-normal">
        <span className="w-8 shrink-0 font-mono text-xs text-fg-subtle tabular">
          {interpolate(copy.tasks.submissions.number, { number })}
        </span>
        <span className="w-36 shrink-0">
          {submission.verdict ? (
            <VerdictBadge verdict={submission.verdict} />
          ) : (
            <Badge tone="info" dot>
              {copy.tasks.submissions.pending}
            </Badge>
          )}
        </span>
        <RelativeTime value={submission.submittedAt} className="text-xs text-fg-muted" />
        <span className="ml-auto flex items-center gap-3">
          {submission.feedbackStatus !== "none" ? (
            <Badge tone={feedbackStatusTone[submission.feedbackStatus]} variant="soft">
              {copy.tasks.submissions.review}
              <span className="font-normal">{feedbackStatusLabels[submission.feedbackStatus]}</span>
            </Badge>
          ) : null}
          <span className="w-16 text-right font-mono text-xs text-fg-muted tabular">
            {formatDuration(submission.durationMs)}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2 pl-11 text-fg">
        <div className="flex items-center justify-end gap-1">
          <CopyButton value={submission.sqlText} />
          <Button size="xs" variant="ghost" onClick={() => onLoad(submission.sqlText)}>
            <CornerDownLeft />
            {copy.results.history.load}
          </Button>
        </div>
        <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
          <SqlCode sql={submission.sqlText} className={SUBMISSION_SAMPLE_MAX_HEIGHT} />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function SubmissionsList({
  taskId,
  onLoad,
}: {
  taskId: string
  onLoad: (sql: string) => void
}) {
  const query = useTaskSubmissions(taskId)
  if (query.isPending) {
    return <SkeletonRows rows={SKELETON_ROWS} className="p-4" />
  }
  if (query.isError) {
    return (
      <ErrorState
        compact
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
      />
    )
  }
  const items = query.data.items
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileClock}
        title={copy.tasks.submissions.emptyTitle}
        description={copy.tasks.submissions.emptyDescription}
      />
    )
  }
  return (
    <Accordion type="single" collapsible className="px-4">
      {items.map((submission, index) => (
        <SubmissionRow
          key={submission.id}
          submission={submission}
          number={items.length - index}
          onLoad={onLoad}
        />
      ))}
    </Accordion>
  )
}
