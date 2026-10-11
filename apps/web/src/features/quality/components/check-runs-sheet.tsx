"use client"

import type { QualityCheck } from "@sequel/contracts"
import { copy, interpolate, qualityRunStatusLabels } from "@sequel/copy"
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
import { ToneBadge } from "@/features/jobs/components/status-badges"
import { cn } from "@/lib/cn"
import { EMPTY_VALUE, formatDateTime, formatDuration } from "@/lib/format"
import { qualityRunStatusTone, toneDotClass } from "@/lib/tones"
import { useQualityRuns } from "../api"
import { checkTarget } from "../model/check-form"
import {
  QUALITY_SKELETON_COLUMNS,
  QUALITY_SKELETON_ROWS,
  RUN_STRIP_LIMIT,
} from "../model/constants"

const t = copy.quality.runs

type CheckRunsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  check: QualityCheck | null
}

export function CheckRunsSheet({ open, onOpenChange, check }: CheckRunsSheetProps) {
  const runs = useQualityRuns(open && check ? check.id : null)
  const items = (runs.data?.items ?? []).slice(0, UI_LIMITS.runsLimit)
  const strip = items.slice(0, RUN_STRIP_LIMIT).reverse()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg">
        <SheetHeader
          title={t.title}
          description={
            check
              ? interpolate(t.description, { name: check.name, target: checkTarget(check) })
              : undefined
          }
          actions={
            <Tooltip content={copy.actions.refresh}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copy.actions.refresh}
                onClick={() => void runs.refetch()}
                disabled={!check || runs.isFetching}
              >
                <RefreshCw className={runs.isFetching ? "animate-spin" : undefined} />
              </Button>
            </Tooltip>
          }
        />
        <SheetBody className="flex flex-col gap-4">
          {runs.isPending ? (
            <SkeletonTable rows={QUALITY_SKELETON_ROWS} columns={QUALITY_SKELETON_COLUMNS.runs} />
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
            <>
              <div aria-hidden className="flex flex-wrap items-center gap-1">
                {strip.map((run) => (
                  <Tooltip
                    key={run.id}
                    content={`${qualityRunStatusLabels[run.status]} ${formatDateTime(run.ranAt)}`}
                  >
                    <span
                      className={cn(
                        "h-5 w-2 rounded-xs",
                        toneDotClass[qualityRunStatusTone[run.status]],
                      )}
                    />
                  </Tooltip>
                ))}
              </div>
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.columns.status}</TableHead>
                      <TableHead className="text-right">{t.columns.observed}</TableHead>
                      <TableHead>{t.columns.message}</TableHead>
                      <TableHead className="text-right">{t.columns.duration}</TableHead>
                      <TableHead>{t.columns.ranAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <ToneBadge
                            tone={qualityRunStatusTone[run.status]}
                            label={qualityRunStatusLabels[run.status]}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular">
                          {run.observedValue ?? EMPTY_VALUE}
                        </TableCell>
                        <TableCell className="max-w-72">
                          <Tooltip content={run.message}>
                            <span className="block truncate text-xs text-fg-muted">
                              {run.message || EMPTY_VALUE}
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular">
                          {formatDuration(run.durationMs)}
                        </TableCell>
                        <TableCell className="text-xs text-fg-muted">
                          <RelativeTime value={run.ranAt} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
