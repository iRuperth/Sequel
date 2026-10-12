import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export const fieldControlClass =
  "w-full rounded-md border border-border bg-surface text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-accent-2 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger"

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type ?? "text"}
      className={cn(fieldControlClass, "h-7 px-2.5 text-base", className)}
      {...props}
    />
  )
}
