"use client"

import type { Widget, WidgetData } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { EllipsisVertical, ExternalLink, Pencil, Trash } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RelativeTime } from "@/components/ui/relative-time"
import { Tooltip } from "@/components/ui/tooltip"
import { routeTo } from "@/config/routes"
import { WidgetBody } from "./widget-body"

type WidgetCardProps = {
  widget: Widget
  data: WidgetData | null
  loading: boolean
  error: unknown
  onEdit: (widget: Widget) => void
  onDelete: (widget: Widget) => void
}

export function WidgetCard({ widget, data, loading, error, onEdit, onDelete }: WidgetCardProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3.5 pt-2.5 pb-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-semibold text-fg" title={widget.title}>
            {widget.title}
          </h3>
          <p className="truncate text-xs text-fg-subtle" title={widget.savedQueryName}>
            {widget.savedQueryName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {data ? (
            <span className="hidden items-center gap-1.5 text-2xs text-fg-subtle sm:inline-flex">
              {data.cached ? (
                <Tooltip content={copy.dashboards.widget.cachedHint}>
                  <Badge className="h-4 px-1 text-2xs">{copy.dashboards.widget.cached}</Badge>
                </Tooltip>
              ) : null}
              <RelativeTime value={data.executedAt} />
            </span>
          ) : null}
          <DropdownMenu>
            <Tooltip content={copy.dashboards.widget.menu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={copy.dashboards.widget.menu}>
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(widget)}>
                <Pencil />
                {copy.dashboards.widget.edit}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routeTo.workbenchWithSavedQuery(widget.savedQueryId)}>
                  <ExternalLink />
                  {copy.dashboards.widget.openQuery}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => onDelete(widget)}>
                <Trash />
                {copy.dashboards.widget.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3.5 pb-3">
        <WidgetBody widget={widget} data={data} loading={loading} error={error} />
      </div>
    </Card>
  )
}
