import { Inbox, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted",
          compact ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5",
        )}
      >
        <Icon />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className={cn("font-medium text-fg", compact ? "text-sm" : "text-base")}>{title}</p>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
