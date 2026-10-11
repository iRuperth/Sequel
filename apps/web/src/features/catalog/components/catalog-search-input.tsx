"use client"

import { copy } from "@sequel/copy"
import { Search, X } from "lucide-react"
import { fieldControlClass } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/cn"

type CatalogSearchInputProps = {
  value: string
  onValueChange: (value: string) => void
  busy?: boolean
  className?: string
}

export function CatalogSearchInput({
  value,
  onValueChange,
  busy,
  className,
}: CatalogSearchInputProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-fg-subtle" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault()
            onValueChange("")
          }
        }}
        placeholder={copy.catalog.search.placeholder}
        aria-label={copy.catalog.search.label}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          fieldControlClass,
          "h-10 pr-16 pl-9.5 text-md [&::-webkit-search-cancel-button]:hidden",
        )}
      />
      <div className="absolute right-2 flex items-center gap-1.5">
        {busy ? <Spinner className="size-3.5" /> : null}
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label={copy.actions.clear}
            className="rounded-sm p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
