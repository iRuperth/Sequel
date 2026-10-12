"use client"

import type { JobStatus, TaskDetail } from "@sequel/contracts"
import { copy, taskTexts } from "@sequel/copy"
import { Info, RefreshCw, TriangleAlert, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/error-state"
import { Meter } from "@/components/ui/meter"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useJob } from "@/features/jobs/model/use-job"
import { formatPercent, formatUptime } from "@/lib/format"
import { useRetryGeneration } from "../api"
import { ELAPSED_TICK_MS, MS_PER_SECOND } from "../model/constants"
import { useNow } from "../model/use-now"
import { stageLabel } from "@/features/jobs/model/stage"

const PERCENT = 100

function stageFallback(status: JobStatus | undefined): string {
  return copy.tasks.generation.stageFallback[status ?? "queued"]
}

export function GenerationPanel({ task }: { task: TaskDetail }) {
  const jobId = task.generation?.jobId ?? null
  const job = useJob(jobId)
  const snapshot = job.snapshot
  const now = useNow(ELAPSED_TICK_MS, !job.isTerminal)
  const startedAt = snapshot?.startedAt ?? snapshot?.createdAt ?? task.createdAt
  const finishedAt = snapshot?.finishedAt ? Date.parse(snapshot.finishedAt) : now
  const elapsedSeconds = Math.max(
    0,
    Math.floor((finishedAt - Date.parse(startedAt)) / MS_PER_SECOND),
  )
  const progress = snapshot?.progress ?? 0
  const status = snapshot?.status ?? task.generation?.status

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-md border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-2">
            <WandSparkles className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-md font-semibold text-fg">{copy.tasks.generation.title}</h2>
            <p className="text-sm text-fg-muted">{copy.tasks.generation.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-fg">
              <Spinner className="size-3.5" />
              <span className="truncate">
                {stageLabel(snapshot?.stage ?? null) ?? stageFallback(status)}
              </span>
            </span>
            <span className="font-mono text-xs text-fg-muted tabular">
              {formatPercent(progress / PERCENT, true)}
            </span>
          </div>
          <Meter
            value={progress}
            max={PERCENT}
            tone="info"
            label={copy.tasks.generation.progress}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
            <span>{copy.tasks.generation.elapsed}</span>
            <span className="font-mono tabular">{formatUptime(elapsedSeconds)}</span>
          </div>
        </div>
        {job.transport === "polling" ? (
          <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Info className="size-3 shrink-0" />
            {copy.errors.sseUnavailable}
          </p>
        ) : null}
        {job.error ? <InlineError error={job.error} /> : null}
      </div>
    </div>
  )
}

export function GenerationFailedPanel({ task }: { task: TaskDetail }) {
  const retry = useRetryGeneration(task.id)
  const onRetry = () => {
    retry.mutate(undefined, {
      onSuccess: () => toast.info(copy.tasks.generation.retried),
    })
  }
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-md border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-danger/12 text-danger">
            <TriangleAlert className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-md font-semibold text-fg">{copy.tasks.generation.failedTitle}</h2>
            <p className="text-sm text-fg-muted">{taskTexts.generationFailed}</p>
          </div>
        </div>
        {task.generation?.error ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-fg-muted">
              {copy.tasks.generation.errorLabel}
            </span>
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs break-words whitespace-pre-wrap text-fg">
              {task.generation.error}
            </pre>
          </div>
        ) : null}
        {retry.isError ? <InlineError error={retry.error} /> : null}
        <div className="flex justify-end">
          <Button variant="primary" onClick={onRetry} loading={retry.isPending}>
            {retry.isPending ? null : <RefreshCw />}
            {copy.actions.retry}
          </Button>
        </div>
      </div>
    </div>
  )
}
