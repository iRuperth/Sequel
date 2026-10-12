"use client"

import { Check, ChevronDown } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"
import { fieldControlClass } from "./input"

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  size = "sm",
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "xs" | "sm" }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        fieldControlClass,
        "flex items-center justify-between gap-2 whitespace-nowrap text-left data-[placeholder]:text-fg-subtle [&>span]:truncate",
        size === "xs" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-base",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-3.5 shrink-0 text-fg-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={4}
        className={cn(
          "relative z-50 max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border-strong bg-surface text-fg animate-fade-in",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex h-7 cursor-default select-none items-center gap-2 rounded-sm pr-7 pl-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
        <Check className="size-3.5 text-accent-2" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "px-2 py-1 text-2xs font-medium uppercase tracking-wide text-fg-subtle",
        className,
      )}
      {...props}
    />
  )
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
}

export type SimpleSelectOption<T extends string> = {
  value: T
  label: ReactNode
}

type SimpleSelectProps<T extends string> = {
  value: T | undefined
  onValueChange: (value: T) => void
  options: readonly SimpleSelectOption<T>[]
  placeholder?: string
  size?: "xs" | "sm"
  className?: string
  id?: string
  disabled?: boolean
  ariaLabel?: string
}

export function SimpleSelect<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  size,
  className,
  id,
  disabled,
  ariaLabel,
}: SimpleSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
      <SelectTrigger id={id} size={size} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
