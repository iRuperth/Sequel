"use client"

import { Command } from "cmdk"
import { Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/cn"
import { fieldControlClass } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export type MultiSelectOption<T extends string> = {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

type MultiSelectProps<T extends string> = {
  id?: string
  options: readonly MultiSelectOption<T>[]
  value: readonly T[]
  onValueChange: (value: T[]) => void
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  removeLabel: string
  max?: number
  className?: string
}

export function MultiSelect<T extends string>({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  removeLabel,
  max,
  className,
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)
  const atLimit = max !== undefined && value.length >= max
  const toggle = (next: T) => {
    if (selected.has(next)) {
      onValueChange(value.filter((item) => item !== next))
      return
    }
    if (atLimit) {
      return
    }
    onValueChange([...value, next])
  }
  const labelFor = (item: T) => options.find((option) => option.value === item)?.label ?? item
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            fieldControlClass,
            "flex min-h-7 flex-wrap items-center gap-1 px-1.5 py-1 text-left",
            className,
          )}
        >
          {value.length === 0 ? (
            <span className="px-1 text-base text-fg-subtle">{placeholder}</span>
          ) : (
            value.map((item) => (
              <span
                key={item}
                className="inline-flex h-5 items-center gap-1 rounded-sm bg-surface-3 pr-0.5 pl-1.5 text-xs text-fg"
              >
                {labelFor(item)}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`${removeLabel} ${labelFor(item)}`}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    toggle(item)
                  }}
                  className="rounded-xs p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))
          )}
          <ChevronDown className="mr-0.5 ml-auto size-3.5 shrink-0 text-fg-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command loop>
          <Command.Input
            placeholder={searchPlaceholder}
            className="h-8 w-full border-b border-border bg-transparent px-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <Command.List className="max-h-64 overflow-y-auto p-1">
            <Command.Empty className="px-2 py-3 text-center text-sm text-fg-muted">
              {emptyLabel}
            </Command.Empty>
            {options.map((option) => {
              const isSelected = selected.has(option.value)
              const disabled = option.disabled || (atLimit && !isSelected)
              return (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  disabled={disabled}
                  onSelect={() => toggle(option.value)}
                  className="flex cursor-default items-start gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:opacity-45 data-[selected=true]:bg-surface-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-xs border",
                      isSelected ? "border-accent bg-accent" : "border-border-strong",
                    )}
                  >
                    {isSelected ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-fg">{option.label}</span>
                    {option.description ? (
                      <span className="text-xs text-fg-muted">{option.description}</span>
                    ) : null}
                  </span>
                </Command.Item>
              )
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
