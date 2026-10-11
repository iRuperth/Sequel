"use client"

import { formatDateTime, formatRelativeTime } from "@/lib/format"
import { useMounted } from "@/lib/hooks/use-platform"
import { cn } from "@/lib/cn"

export function RelativeTime({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  const mounted = useMounted()
  if (!value) {
    return <span className={cn("text-fg-subtle", className)}>{formatRelativeTime(null)}</span>
  }
  return (
    <time
      dateTime={value}
      title={formatDateTime(value)}
      className={cn("whitespace-nowrap", className)}
    >
      {mounted ? formatRelativeTime(value) : formatDateTime(value)}
    </time>
  )
}
