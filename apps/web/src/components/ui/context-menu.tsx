"use client"

import { ContextMenu as ContextPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { menuContentClass, menuItemClass } from "./dropdown-menu"

export const ContextMenu = ContextPrimitive.Root
export const ContextMenuTrigger = ContextPrimitive.Trigger

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextPrimitive.Content>) {
  return (
    <ContextPrimitive.Portal>
      <ContextPrimitive.Content className={cn(menuContentClass, className)} {...props} />
    </ContextPrimitive.Portal>
  )
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentProps<typeof ContextPrimitive.Item>) {
  return <ContextPrimitive.Item className={cn(menuItemClass, className)} {...props} />
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextPrimitive.Separator>) {
  return (
    <ContextPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
  )
}

export function ContextMenuLabel({
  className,
  ...props
}: ComponentProps<typeof ContextPrimitive.Label>) {
  return (
    <ContextPrimitive.Label
      className={cn("truncate px-2 py-1 font-mono text-2xs text-fg-subtle", className)}
      {...props}
    />
  )
}
