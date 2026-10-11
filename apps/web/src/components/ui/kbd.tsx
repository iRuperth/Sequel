import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border border-border bg-surface-2 px-1 font-sans text-2xs font-medium text-fg-muted",
        className,
      )}
      {...props}
    />
  )
}

export function KeyCombo({ keys, className }: { keys: readonly string[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  )
}
