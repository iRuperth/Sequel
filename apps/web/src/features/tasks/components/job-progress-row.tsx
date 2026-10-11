import type { JobSnapshot } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Info } from "lucide-react"
import { IndeterminateBar, Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/cn"
import type { JobTransport } from "@/features/jobs/model/use-job"
import { stageLabel } from "@/features/jobs/model/stage"

export function JobProgressRow({
  label,
  snapshot,
  fallbackStage,
  transport,
  className,
}: {
  label: string
  snapshot: JobSnapshot | null
  fallbackStage: string
  transport?: JobTransport
  className?: string
}) {
  return (
    <div role="status" className={cn("flex flex-col overflow-hidden", className)}>
      <IndeterminateBar />
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <Spinner className="size-3.5" />
          <span className="font-medium text-fg">{label}</span>
          <span className="truncate text-fg-muted">
            {stageLabel(snapshot?.stage ?? null) ?? fallbackStage}
          </span>
        </span>
        {transport === "polling" ? (
          <span className="flex shrink-0 items-center gap-1 text-fg-subtle">
            <Info className="size-3" />
            {copy.errors.sseUnavailable}
          </span>
        ) : null}
      </div>
    </div>
  )
}
