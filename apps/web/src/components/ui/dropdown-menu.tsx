"use client"

import { Check, ChevronRight } from "lucide-react"
import { DropdownMenu as MenuPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export const DropdownMenu = MenuPrimitive.Root
export const DropdownMenuTrigger = MenuPrimitive.Trigger
export const DropdownMenuGroup = MenuPrimitive.Group
export const DropdownMenuSub = MenuPrimitive.Sub
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

export const menuContentClass =
  "z-50 min-w-44 overflow-hidden rounded-md border border-border-strong bg-surface p-1 text-fg animate-fade-in"
export const menuItemClass =
  "relative flex h-7 cursor-default select-none items-center gap-2 rounded-sm px-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-45 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fg-muted"

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(menuContentClass, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(menuItemClass, destructive && "text-danger [&_svg]:text-danger", className)}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(menuItemClass, "pl-7", className)} {...props}>
      <span className="absolute left-2 inline-flex items-center">
        <MenuPrimitive.ItemIndicator>
          <Check className="text-accent-2" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(menuItemClass, "pl-7", className)} {...props}>
      <span className="absolute left-2 inline-flex items-center">
        <MenuPrimitive.ItemIndicator>
          <Check className="text-accent-2" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn(
        "px-2 py-1 text-2xs font-medium uppercase tracking-wide text-fg-subtle",
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
  )
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto pl-4 font-mono text-2xs tracking-wide text-fg-subtle", className)}
      {...props}
    />
  )
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger
      className={cn(menuItemClass, "data-[state=open]:bg-surface-2", className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  )
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent className={cn(menuContentClass, className)} {...props} />
    </MenuPrimitive.Portal>
  )
}
