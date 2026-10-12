"use client"

import { copy } from "@sequel/copy"
import { Search, X } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { fieldControlClass } from "./input"

type SearchInputProps = Omit<ComponentProps<"input">, "onChange" | "value" | "size"> & {
  value: string
  onValueChange: (value: string) => void
  size?: "xs" | "sm"
}

export function SearchInput({
  value,
  onValueChange,
  className,
  size = "sm",
  placeholder = copy.actions.search,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-2 text-fg-subtle",
          size === "xs" ? "size-3" : "size-3.5",
        )}
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          fieldControlClass,
          "[&::-webkit-search-cancel-button]:hidden",
          size === "xs" ? "h-6 pr-6 pl-6.5 text-xs" : "h-7 pr-7 pl-7 text-base",
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={copy.actions.clear}
          className="absolute right-1.5 rounded-sm p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  )
}
