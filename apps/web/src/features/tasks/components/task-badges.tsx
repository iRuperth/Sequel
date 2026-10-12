import type { Difficulty, TaskStatus, Verdict } from "@sequel/contracts"
import {
  difficultyLabels,
  difficultySeniority,
  taskStatusLabels,
  verdictLabels,
} from "@sequel/copy"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/cn"
import { difficultyTone, taskStatusTone, toneDotClass, verdictTone } from "@/lib/tones"

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const tone = taskStatusTone[status]
  return (
    <Badge tone={tone} className={className}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          toneDotClass[tone],
          status === "generating" && "animate-pulse-soft",
        )}
      />
      {taskStatusLabels[status]}
    </Badge>
  )
}

export function DifficultyBadge({
  difficulty,
  showSeniority = true,
  className,
}: {
  difficulty: Difficulty
  showSeniority?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge tone={difficultyTone[difficulty]}>{difficultyLabels[difficulty]}</Badge>
      {showSeniority ? (
        <span className="text-xs whitespace-nowrap text-fg-muted">
          {difficultySeniority[difficulty]}
        </span>
      ) : null}
    </span>
  )
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <Badge tone={verdictTone[verdict]} dot className={className}>
      {verdictLabels[verdict]}
    </Badge>
  )
}
