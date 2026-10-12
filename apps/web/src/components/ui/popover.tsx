"use client"

import { Popover as PopoverPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md border border-border-strong bg-surface p-1 text-fg animate-fade-in focus:outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
