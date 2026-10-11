"use client"

import type { ExecutionSummary } from "@sequel/contracts"
import { copy, executionStatusLabels } from "@sequel/copy"
import { ArrowRight, ListClock, SquareTerminal } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SkeletonRows } from "@/components/ui/skeleton"
import { SqlCode } from "@/components/ui/sql-code"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip } from "@/components/ui/tooltip"
import { UI_LIMITS } from "@/config/constants"
import { ROUTES, routeTo } from "@/config/routes"
import { useRecentExecutions } from "@/features/history/api"
import { formatDuration } from "@/lib/format"
import { executionStatusTone } from "@/lib/tones"
import { firstSqlLine } from "../model/sql-preview"
import { useOpenInWorkbench } from "@/features/workbench/model/open-in-workbench"

const SKELETON_ROWS = 4
const PREVIEW_DELAY_MS = 500
const RECENT_FILTERS = { limit: UI_LIMITS.homeRecentQueries }
const recentCopy = copy.home.recentQueries

function RecentQueryRow({ execution }: { execution: ExecutionSummary }) {
  const { linkHandler } = useOpenInWorkbench()
  const statusLabel = executionStatusLabels[execution.status]
  return (
    <li>
      <Tooltip
        side="bottom"
        align="start"
        delayDuration={PREVIEW_DELAY_MS}
        content={
          <div className="flex flex-col gap-1.5 py-0.5">
            <span className="text-fg-muted">{statusLabel}</span>
            <SqlCode sql={execution.sqlText} wrap maxLines={UI_LIMITS.sqlPreviewLines} />
          </div>
        }
      >
        <Link
          href={routeTo.workbenchWithSql(execution.sqlText)}
          onClick={linkHandler(execution.sqlText)}
          className="flex h-10 items-center gap-3 px-4 transition-colors hover:bg-surface-2/60"
        >
          <StatusDot tone={executionStatusTone[execution.status]} />
          <span className="sr-only">{statusLabel}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">
            {firstSqlLine(execution.sqlText)}
          </span>
          <span className="w-16 shrink-0 text-right font-mono text-xs tabular text-fg-muted">
            {formatDuration(execution.durationMs)}
          </span>
          <RelativeTime
            value={execution.executedAt}
            className="w-20 shrink-0 text-right text-xs text-fg-subtle"
          />
        </Link>
      </Tooltip>
    </li>
  )
}

export function RecentQueriesCard() {
  const query = useRecentExecutions(RECENT_FILTERS)
  const items = query.data?.items ?? []
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<ListClock />}
        title={recentCopy.title}
        description={recentCopy.description}
        actions={
          <Button variant="ghost" size="xs" asChild>
            <Link href={ROUTES.history}>
              {copy.actions.viewAll}
              <ArrowRight />
            </Link>
          </Button>
        }
      />
      {query.isPending ? (
        <SkeletonRows rows={SKELETON_ROWS} className="p-4" />
      ) : query.isError ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          icon={SquareTerminal}
          title={recentCopy.emptyTitle}
          description={recentCopy.emptyDescription}
          action={
            <Button asChild>
              <Link href={ROUTES.workbench}>{copy.actions.openInWorkbench}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((execution) => (
            <RecentQueryRow key={execution.id} execution={execution} />
          ))}
        </ul>
      )}
    </Card>
  )
}
