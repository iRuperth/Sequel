"use client"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"

export const TooltipProvider = TooltipPrimitive.Provider

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-sm border border-border-strong bg-surface-3 px-2 py-1 text-xs text-fg animate-fade-in",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: ComponentProps<typeof TooltipPrimitive.Content>["side"]
  align?: ComponentProps<typeof TooltipPrimitive.Content>["align"]
  disabled?: boolean
  delayDuration?: number
}

export function Tooltip({ content, children, side, align, disabled, delayDuration }: TooltipProps) {
  if (disabled || content === null || content === undefined || content === "") {
    return <>{children}</>
  }
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side} align={align}>
        {content}
      </TooltipContent>
    </TooltipPrimitive.Root>
  )
}
