"use client"

import { copy, executionModeLabels } from "@sequel/copy"
import { ArrowUpRight, ListClock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SkeletonRows } from "@/components/ui/skeleton"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip } from "@/components/ui/tooltip"
import { UI_LIMITS } from "@/config/constants"
import { ROUTES } from "@/config/routes"
import { useRecentExecutions } from "@/features/history/api"
import { formatCompact, formatDuration } from "@/lib/format"
import { executionStatusTone } from "@/lib/tones"

const HISTORY_FILTERS = { source: "workbench", limit: UI_LIMITS.sessionHistoryLimit } as const

export function HistoryPanel({ onLoad }: { onLoad: (sql: string) => void }) {
  const query = useRecentExecutions(HISTORY_FILTERS)
  if (query.isPending) {
    return <SkeletonRows rows={6} className="p-3" rowClassName="h-6" />
  }
  if (query.isError) {
    return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
  }
  const items = query.data.items
  if (items.length === 0) {
    return <EmptyState compact icon={ListClock} title={copy.results.history.empty} />
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ul className="min-h-0 flex-1 overflow-auto">
        {items.map((item) => (
          <li key={item.id}>
            <Tooltip content={copy.results.history.load} side="top" delayDuration={600}>
              <button
                type="button"
                onClick={() => onLoad(item.sqlText)}
                className="grid w-full grid-cols-[12px_minmax(0,1fr)_96px_72px_64px_88px] items-center gap-3 border-b border-border/70 px-3 py-1.5 text-left hover:bg-surface-2/60"
              >
                <StatusDot tone={executionStatusTone[item.status]} />
                <span className="truncate font-mono text-xs text-fg">
                  {item.sqlText.replace(/\s+/g, " ").trim()}
                </span>
                <span className="truncate text-2xs text-fg-muted">
                  {executionModeLabels[item.mode]}
                </span>
                <span className="text-right font-mono text-2xs text-fg-muted tabular">
                  {formatDuration(item.durationMs)}
                </span>
                <span className="text-right font-mono text-2xs text-fg-muted tabular">
                  {item.rowCount === null ? copy.common.notAvailable : formatCompact(item.rowCount)}
                </span>
                <RelativeTime
                  value={item.executedAt}
                  className="text-right text-2xs text-fg-subtle"
                />
              </button>
            </Tooltip>
          </li>
        ))}
      </ul>
      <div className="flex shrink-0 justify-end border-t border-border px-2 py-1">
        <Button variant="ghost" size="xs" asChild>
          <Link href={ROUTES.history}>
            {copy.results.history.viewAll}
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}
