import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("animate-pulse-soft rounded-sm bg-surface-2", className)} {...props} />
}

export function SkeletonRows({
  rows = 6,
  className,
  rowClassName,
}: {
  rows?: number
  className?: string
  rowClassName?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn("h-8 w-full", rowClassName)} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="flex h-8 items-center gap-4 border-b border-border bg-surface-2 px-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2.5 flex-1 bg-surface-3" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex h-9 items-center gap-4 border-b border-border px-3 last:border-b-0"
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className="h-2.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
