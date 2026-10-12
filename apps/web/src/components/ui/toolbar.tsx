import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function FilterBar({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap items-center gap-2 pb-3", className)} {...props} />
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return <div aria-hidden className={cn("mx-1 h-4 w-px bg-border", className)} />
}
