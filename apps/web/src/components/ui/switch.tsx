"use client"

import { Switch as SwitchPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-border-strong bg-surface-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3 translate-x-0.5 rounded-full bg-fg-muted transition-transform data-[state=checked]:translate-x-3 data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  )
}
