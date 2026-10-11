"use client"

import type { SavedQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import type { KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { EMPTY_VALUE } from "@/lib/format"
import { VISIBLE_TAGS_PER_ROW } from "../model/constants"
import { formatTags } from "../model/tags"
import { FavouriteToggle } from "./favourite-toggle"
import { SavedQueryActionsMenu } from "./saved-query-actions-menu"

function TagList({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) {
    return <span className="text-fg-subtle">{EMPTY_VALUE}</span>
  }
  const visible = tags.slice(0, VISIBLE_TAGS_PER_ROW)
  const hidden = tags.length - visible.length
  return (
    <span className="flex flex-nowrap items-center gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
      {hidden > 0 ? (
        <Tooltip content={formatTags(tags.slice(VISIBLE_TAGS_PER_ROW))}>
          <Badge tabIndex={0}>{interpolate(copy.savedQueries.moreTags, { count: hidden })}</Badge>
        </Tooltip>
      ) : null}
    </span>
  )
}

type SavedQueriesTableProps = {
  items: readonly SavedQuery[]
  selectedId: string | null
  onSelect: (query: SavedQuery) => void
  onEdit: (query: SavedQuery) => void
  onDelete: (query: SavedQuery) => void
}

export function SavedQueriesTable({
  items,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: SavedQueriesTableProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, query: SavedQuery) => {
    if (event.target !== event.currentTarget) {
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(query)
    }
  }
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-2">
              <span className="sr-only">{copy.savedQueries.columns.favourite}</span>
            </TableHead>
            <TableHead>{copy.savedQueries.columns.name}</TableHead>
            <TableHead>{copy.savedQueries.columns.tags}</TableHead>
            <TableHead>{copy.savedQueries.columns.dataset}</TableHead>
            <TableHead>{copy.savedQueries.columns.lastRun}</TableHead>
            <TableHead>{copy.savedQueries.columns.updated}</TableHead>
            <TableHead className="w-10 px-2">
              <span className="sr-only">{copy.savedQueries.columns.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((query) => (
            <TableRow
              key={query.id}
              interactive
              tabIndex={0}
              selected={query.id === selectedId}
              onClick={() => onSelect(query)}
              onKeyDown={(event) => onKeyDown(event, query)}
              className="outline-none focus-visible:bg-surface-2"
            >
              <TableCell className="px-2">
                <FavouriteToggle query={query} />
              </TableCell>
              <TableCell className="w-full max-w-0 py-1.5">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-fg">{query.name}</span>
                  {query.description ? (
                    <span className="truncate text-xs text-fg-muted" title={query.description}>
                      {query.description}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <TagList tags={query.tags} />
              </TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap text-fg-muted">
                {query.datasetSlug ?? (
                  <span className="font-sans text-fg-subtle">{EMPTY_VALUE}</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-fg-muted">
                <RelativeTime value={query.lastRunAt} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-fg-muted">
                <RelativeTime value={query.updatedAt} />
              </TableCell>
              <TableCell className="px-2">
                <SavedQueryActionsMenu query={query} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
