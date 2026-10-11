"use client"

import { Check } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-xs border border-border-strong bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3 text-white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
