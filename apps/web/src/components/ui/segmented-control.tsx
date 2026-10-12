"use client"

import { ToggleGroup } from "radix-ui"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type SegmentedControlProps<T extends string> = {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  ariaLabel: string
  className?: string
  size?: "xs" | "sm"
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  size = "sm",
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onValueChange(next as T)
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        size === "xs" ? "h-6" : "h-7",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-45 data-[state=on]:bg-surface-3 data-[state=on]:text-fg [&_svg]:size-3.5",
            size === "xs" ? "px-2 text-xs" : "px-2.5 text-sm",
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
