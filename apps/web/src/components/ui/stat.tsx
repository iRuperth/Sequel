import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import { Skeleton } from "./skeleton"

type StatProps = {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  loading?: boolean
  className?: string
}

export function Stat({ label, value, hint, icon, loading = false, className }: StatProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-fg-muted">
        <span className="truncate">{label}</span>
        {icon ? <span className="text-fg-subtle [&_svg]:size-3.5">{icon}</span> : null}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <div className="font-mono text-2xl font-medium tracking-tight tabular text-fg">{value}</div>
      )}
      {hint ? <div className="truncate text-xs text-fg-subtle">{hint}</div> : null}
    </div>
  )
}
