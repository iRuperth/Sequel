"use client"

import { copy } from "@sequel/copy"
import { Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { TagCount } from "../model/tags"

type TagFilterProps = {
  tags: readonly TagCount[]
  selected: readonly string[]
  onToggle: (tag: string) => void
  onClear: () => void
}

export function TagFilter({ tags, selected, onToggle, onClear }: TagFilterProps) {
  if (tags.length === 0) {
    return null
  }
  return (
    <div
      role="group"
      aria-label={copy.savedQueries.filters.tagsLabel}
      className="flex flex-wrap items-center gap-1.5 pb-3"
    >
      <span className="inline-flex items-center gap-1 pr-1 text-xs text-fg-muted">
        <Tag className="size-3.5 text-fg-subtle" aria-hidden />
        {copy.savedQueries.filters.tagsLabel}
      </span>
      {tags.map(({ tag, count }) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(tag)}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs transition-colors",
              active
                ? "border-transparent bg-accent/15 text-accent-2"
                : "border-border text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {tag}
            <span className="font-mono text-2xs text-fg-subtle tabular">{count}</span>
          </button>
        )
      })}
      {selected.length > 0 ? (
        <Button variant="ghost" size="xs" onClick={onClear}>
          {copy.savedQueries.filters.clearTags}
        </Button>
      ) : null}
    </div>
  )
}
