"use client"

import type { SavedQuery } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { useToggleSavedQueryFavorite } from "../api"

export function FavouriteToggle({ query, className }: { query: SavedQuery; className?: string }) {
  const toggle = useToggleSavedQueryFavorite()
  const label = query.isFavorite
    ? copy.savedQueries.actions.unfavourite
    : copy.savedQueries.actions.favourite
  const onClick = () => {
    const isFavorite = !query.isFavorite
    toggle.mutate(
      { id: query.id, isFavorite },
      {
        onSuccess: () =>
          toast.success(isFavorite ? copy.savedQueries.favourited : copy.savedQueries.unfavourited),
        onError: (error) => toast.fromError(error),
      },
    )
  }
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        aria-pressed={query.isFavorite}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
        className={className}
      >
        <Star
          className={cn(query.isFavorite ? "fill-warning text-warning" : "text-fg-subtle")}
          aria-hidden
        />
      </Button>
    </Tooltip>
  )
}
