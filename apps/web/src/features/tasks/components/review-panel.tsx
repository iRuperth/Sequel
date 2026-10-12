"use client"

import type { ReviewFeedback, Submission } from "@sequel/contracts"
import { copy, jobStageLabels, taskTexts } from "@sequel/copy"
import { Bot, CircleAlert, CircleCheck, CornerDownLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/error-state"
import { CopyButton } from "@/components/ui/copy-button"
import { SqlCode } from "@/components/ui/sql-code"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { useJob } from "@/features/jobs/model/use-job"
import { useLlmStatus, usePreferences } from "@/features/settings/api"
import { cn } from "@/lib/cn"
import { useRequestFeedback } from "../api"
import { SUGGESTED_SQL_MAX_HEIGHT } from "../model/constants"
import { JobProgressRow } from "./job-progress-row"

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string
  items: readonly string[]
  tone: "success" | "warning"
}) {
  if (items.length === 0) {
    return null
  }
  const Icon = tone === "success" ? CircleCheck : CircleAlert
  return (
    <div className="flex flex-col gap-1.5">
      <h5 className="text-xs font-medium text-fg-muted">{title}</h5>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-fg">
            <Icon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                tone === "success" ? "text-success" : "text-warning",
              )}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReviewComments({
  feedback,
  onUseSql,
}: {
  feedback: ReviewFeedback
  onUseSql: (sql: string) => void
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-2">
        <Bot className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-md border border-border bg-surface px-3.5 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-muted">{copy.tasks.review.reviewer}</span>
          <p className="text-sm leading-relaxed whitespace-pre-line text-fg">{feedback.summary}</p>
        </div>
        <FeedbackList
          title={copy.tasks.review.strengths}
          items={feedback.strengths}
          tone="success"
        />
        <FeedbackList
          title={copy.tasks.review.improvements}
          items={feedback.improvements}
          tone="warning"
        />
        {feedback.suggestedSql ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-medium text-fg-muted">
                {copy.tasks.review.suggestedSql}
              </h5>
              <div className="flex items-center gap-1">
                <CopyButton value={feedback.suggestedSql} />
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => onUseSql(feedback.suggestedSql ?? "")}
                >
                  <CornerDownLeft />
                  {copy.tasks.review.useInEditor}
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2">
              <SqlCode sql={feedback.suggestedSql} className={SUGGESTED_SQL_MAX_HEIGHT} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ReviewPanel({
  taskId,
  submission,
  feedbackJobId,
  onFeedbackJob,
  onUseSql,
}: {
  taskId: string
  submission: Submission
  feedbackJobId: string | null
  onFeedbackJob: (jobId: string) => void
  onUseSql: (sql: string) => void
}) {
  const llm = useLlmStatus()
  const preferences = usePreferences()
  const request = useRequestFeedback(taskId)
  const job = useJob(submission.feedbackStatus === "queued" ? feedbackJobId : null)
  const graded = submission.status === "graded"
  const canRequest = submission.feedbackStatus === "none" || submission.feedbackStatus === "failed"

  const blockedReason =
    llm.data?.configured === false
      ? copy.tasks.review.notConfigured
      : llm.data?.feedbackEnabled === false || !preferences.llmFeedbackEnabled
        ? copy.tasks.review.disabled
        : null

  const onRequest = () => {
    request.mutate(submission.id, {
      onSuccess: ({ jobId }) => {
        onFeedbackJob(jobId)
        toast.info(copy.tasks.review.requested)
      },
    })
  }

  const requestButton = (
    <Button
      size="sm"
      variant="secondary"
      onClick={onRequest}
      loading={request.isPending}
      disabled={blockedReason !== null}
    >
      {request.isPending ? null : <Sparkles />}
      {copy.actions.requestReview}
    </Button>
  )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="text-sm font-semibold text-fg">{copy.tasks.review.title}</h4>
          <p className="text-xs text-fg-muted">{copy.tasks.review.description}</p>
        </div>
        {graded && canRequest ? (
          blockedReason ? (
            <Tooltip content={blockedReason}>
              <span tabIndex={0} className="inline-flex rounded-md">
                {requestButton}
              </span>
            </Tooltip>
          ) : (
            requestButton
          )
        ) : null}
      </div>
      {submission.feedbackStatus === "failed" ? (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert className="size-3.5" />
          {taskTexts.reviewUnavailable}
        </p>
      ) : null}
      {request.isError ? <InlineError error={request.error} /> : null}
      {submission.feedbackStatus === "queued" ? (
        <JobProgressRow
          label={copy.tasks.review.inProgress}
          snapshot={job.snapshot}
          fallbackStage={jobStageLabels.queued}
          transport={job.transport}
          className="rounded-md border border-border bg-surface"
        />
      ) : null}
      {submission.feedbackStatus === "ready" && submission.feedback ? (
        <ReviewComments feedback={submission.feedback} onUseSql={onUseSql} />
      ) : null}
    </section>
  )
}
