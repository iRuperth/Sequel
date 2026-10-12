import type { JobStatus, RunStatus } from "@sequel/contracts"
import { jobStatusLabels, runStatusLabels } from "@sequel/copy"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import { type Tone, jobStatusTone, runStatusTone } from "@/lib/tones"

export function ToneBadge({
  tone,
  label,
  pulse = false,
}: {
  tone: Tone
  label: string
  pulse?: boolean
}) {
  return (
    <Badge tone={tone}>
      <StatusDot tone={tone} pulse={pulse} className="size-1.5" />
      {label}
    </Badge>
  )
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <ToneBadge
      tone={jobStatusTone[status]}
      label={jobStatusLabels[status]}
      pulse={status === "running"}
    />
  )
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <ToneBadge
      tone={runStatusTone[status]}
      label={runStatusLabels[status]}
      pulse={status === "running"}
    />
  )
}
