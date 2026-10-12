"use client"

import type { SavedQuery } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Copy, Pencil, SquareTerminal, Trash2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DescriptionList } from "@/components/ui/description-list"
import { RelativeTime } from "@/components/ui/relative-time"
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet"
import { SqlCode } from "@/components/ui/sql-code"
import { routeTo } from "@/config/routes"
import { copySqlToClipboard } from "../model/actions"
import { FavouriteToggle } from "./favourite-toggle"

type SavedQuerySheetProps = {
  query: SavedQuery | null
  onClose: () => void
  onEdit: (query: SavedQuery) => void
  onDelete: (query: SavedQuery) => void
}

function SheetDetails({ query }: { query: SavedQuery }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2.5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          {copy.savedQueries.detail.sql}
        </h3>
        <div className="rounded-md border border-border bg-surface-2/40">
          <SqlCode sql={query.sqlText} wrap className="max-h-[420px] px-3.5 py-3" />
        </div>
      </section>
      <DescriptionList
        columns={2}
        items={[
          {
            label: copy.savedQueries.detail.dataset,
            value: query.datasetSlug ? (
              <Link
                href={routeTo.catalogDataset(query.datasetSlug)}
                className="text-accent-2 hover:underline"
              >
                {query.datasetSlug}
              </Link>
            ) : (
              <span className="font-sans text-sm text-fg-subtle">
                {copy.savedQueries.detail.noDataset}
              </span>
            ),
            mono: true,
          },
          {
            label: copy.savedQueries.detail.tags,
            value:
              query.tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {query.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ) : (
                <span className="text-fg-subtle">{copy.savedQueries.detail.noTags}</span>
              ),
          },
          {
            label: copy.savedQueries.detail.favourite,
            value: query.isFavorite ? copy.common.yes : copy.common.no,
          },
          {
            label: copy.savedQueries.detail.lastRun,
            value: query.lastRunAt ? (
              <RelativeTime value={query.lastRunAt} />
            ) : (
              <span className="text-fg-subtle">{copy.savedQueries.detail.neverRun}</span>
            ),
          },
          {
            label: copy.savedQueries.detail.created,
            value: <RelativeTime value={query.createdAt} />,
          },
          {
            label: copy.savedQueries.detail.updated,
            value: <RelativeTime value={query.updatedAt} />,
          },
          {
            label: copy.savedQueries.detail.queryId,
            value: <span className="break-all">{query.id}</span>,
            mono: true,
          },
        ]}
      />
    </div>
  )
}

export function SavedQuerySheet({ query, onClose, onEdit, onDelete }: SavedQuerySheetProps) {
  return (
    <Sheet open={query !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent width="lg">
        {query ? (
          <>
            <SheetHeader
              title={query.name}
              description={query.description ?? copy.savedQueries.detail.noDescription}
              actions={<FavouriteToggle query={query} />}
            />
            <SheetBody>
              <SheetDetails query={query} />
            </SheetBody>
            <SheetFooter className="justify-between">
              <Button variant="danger-ghost" onClick={() => onDelete(query)}>
                <Trash2 />
                {copy.savedQueries.actions.delete}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => void copySqlToClipboard(query.sqlText)}>
                  <Copy />
                  {copy.savedQueries.actions.copySql}
                </Button>
                <Button variant="secondary" onClick={() => onEdit(query)}>
                  <Pencil />
                  {copy.savedQueries.actions.edit}
                </Button>
                <Button variant="primary" asChild>
                  <Link href={routeTo.workbenchWithSavedQuery(query.id)}>
                    <SquareTerminal />
                    {copy.savedQueries.actions.open}
                  </Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
