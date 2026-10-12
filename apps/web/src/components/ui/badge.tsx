import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { type Tone, toneDotClass, toneSoftClass } from "@/lib/tones"

type BadgeProps = ComponentProps<"span"> & {
  tone?: Tone
  variant?: "soft" | "outline"
  dot?: boolean
  mono?: boolean
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  dot = false,
  mono = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 text-xs font-medium",
        variant === "soft" ? toneSoftClass[tone] : "border border-border text-fg-muted",
        mono && "font-mono text-2xs",
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", toneDotClass[tone])} /> : null}
      {children}
    </span>
  )
}
