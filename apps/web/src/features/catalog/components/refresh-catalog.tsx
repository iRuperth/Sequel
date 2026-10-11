"use client"

import type { JobSnapshot } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Meter } from "@/components/ui/meter"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip } from "@/components/ui/tooltip"
import { PROGRESS_MAX } from "../model/constants"
import { stageLabel } from "@/features/jobs/model/stage"

export function RefreshCatalogButton({
  running,
  onRefresh,
}: {
  running: boolean
  onRefresh: () => void
}) {
  return (
    <Tooltip content={running ? null : copy.catalog.refresh.tooltip}>
      <Button variant="secondary" loading={running} onClick={onRefresh}>
        {running ? null : <RefreshCw />}
        {running ? copy.catalog.refresh.running : copy.catalog.refresh.action}
      </Button>
    </Tooltip>
  )
}

export function RefreshCatalogProgress({ snapshot }: { snapshot: JobSnapshot | null }) {
  const progress = snapshot?.progress ?? 0
  const label =
    stageLabel(snapshot?.stage ?? null) ??
    (snapshot?.status === "running" ? copy.catalog.refresh.running : copy.catalog.refresh.queued)
  return (
    <div className="flex min-w-0 items-center gap-2.5" aria-live="polite">
      <Spinner className="size-3.5" />
      <span className="truncate text-sm text-fg-muted">{label}</span>
      <Meter
        value={progress}
        max={PROGRESS_MAX}
        className="w-36"
        label={copy.catalog.refresh.running}
      />
      <span className="font-mono text-xs text-fg-muted tabular">
        {interpolate(copy.catalog.refresh.progress, { progress })}
      </span>
    </div>
  )
}
