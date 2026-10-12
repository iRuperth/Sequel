import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export type DescriptionItem = {
  label: ReactNode
  value: ReactNode
  mono?: boolean
}

export function DescriptionList({
  items,
  columns = 1,
  className,
}: {
  items: readonly DescriptionItem[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-fg-muted">{item.label}</dt>
          <dd
            className={cn("min-w-0 text-sm break-words text-fg", item.mono && "font-mono text-xs")}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
