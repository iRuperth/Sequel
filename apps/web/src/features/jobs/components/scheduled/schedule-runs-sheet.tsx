"use client"

import type { ScheduledQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { FileClock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { Sheet, SheetBody, SheetContent, SheetHeader } from "@/components/ui/sheet"
import { SkeletonTable } from "@/components/ui/skeleton"
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
import { UI_LIMITS } from "@/config/constants"
import { EMPTY_VALUE, formatDuration, formatInteger } from "@/lib/format"
import { useScheduledRuns } from "../../api-scheduled"
import { JOBS_SKELETON_COLUMNS, JOBS_SKELETON_ROWS } from "../../model/constants"
import { RunStatusBadge } from "../status-badges"

const t = copy.jobs.runs

type ScheduleRunsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: ScheduledQuery | null
}

export function ScheduleRunsSheet({ open, onOpenChange, schedule }: ScheduleRunsSheetProps) {
  const runs = useScheduledRuns(open && schedule ? schedule.id : null)
  const items = (runs.data?.items ?? []).slice(0, UI_LIMITS.runsLimit)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg">
        <SheetHeader
          title={t.title}
          description={schedule ? interpolate(t.description, { name: schedule.name }) : undefined}
          actions={
            <Tooltip content={copy.actions.refresh}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copy.actions.refresh}
                onClick={() => void runs.refetch()}
                disabled={!schedule || runs.isFetching}
              >
                <RefreshCw className={runs.isFetching ? "animate-spin" : undefined} />
              </Button>
            </Tooltip>
          }
        />
        <SheetBody>
          {runs.isPending ? (
            <SkeletonTable rows={JOBS_SKELETON_ROWS} columns={JOBS_SKELETON_COLUMNS.runs} />
          ) : runs.isError ? (
            <ErrorState
              compact
              error={runs.error}
              onRetry={() => void runs.refetch()}
              retrying={runs.isRefetching}
            />
          ) : items.length === 0 ? (
            <EmptyState
              compact
              icon={FileClock}
              title={t.empty.title}
              description={t.empty.description}
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columns.status}</TableHead>
                    <TableHead>{t.columns.started}</TableHead>
                    <TableHead>{t.columns.finished}</TableHead>
                    <TableHead className="text-right">{t.columns.duration}</TableHead>
                    <TableHead className="text-right">{t.columns.rows}</TableHead>
                    <TableHead>{t.columns.error}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <RunStatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        <RelativeTime value={run.startedAt} />
                      </TableCell>
                      <TableCell className="text-fg-muted">
                        <RelativeTime value={run.finishedAt} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular">
                        {formatDuration(run.durationMs)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular">
                        {formatInteger(run.rowCount)}
                      </TableCell>
                      <TableCell className="max-w-56">
                        {run.error ? (
                          <Tooltip content={run.error}>
                            <span className="block truncate text-xs text-danger">{run.error}</span>
                          </Tooltip>
                        ) : (
                          <span className="text-fg-subtle">{EMPTY_VALUE}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
