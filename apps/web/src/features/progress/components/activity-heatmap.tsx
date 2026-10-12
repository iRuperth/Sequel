"use client"

import { copy, interpolate, pluralize } from "@sequel/copy"
import { CalendarDays } from "lucide-react"
import { useMemo } from "react"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip } from "@/components/ui/tooltip"
import { UI_LIMITS } from "@/config/constants"
import { cn } from "@/lib/cn"
import { EMPTY_VALUE, formatDate, formatInteger } from "@/lib/format"
import { useActivity } from "../api"
import {
  HEAT_LEVELS,
  type HeatCell,
  type HeatLevel,
  type HeatmapModel,
  WEEKDAY_LABEL_ROWS,
  buildHeatmap,
  toCalendarDate,
  utcToday,
} from "../model/activity"

const HEAT_CLASS: Record<HeatLevel, string> = {
  0: "bg-heat-0",
  1: "bg-heat-1",
  2: "bg-heat-2",
  3: "bg-heat-3",
  4: "bg-heat-4",
}

const CELL_CLASS = "size-[13px] shrink-0 rounded-xs"
const TOOLTIP_DELAY_MS = 80
const ACTIVITY_DAYS = UI_LIMITS.activityWeeks * UI_LIMITS.daysPerWeek
const activityCopy = copy.progress.activity

function countLabel(count: number, singular: string, plural: string): string {
  return interpolate(pluralize(count, singular, plural), { count: formatInteger(count) })
}

function activeDaysLabel(count: number): string {
  return interpolate(pluralize(count, activityCopy.activeDays, activityCopy.activeDaysPlural), {
    count: formatInteger(count),
    weeks: UI_LIMITS.activityWeeks,
  })
}

function tasksLine(cell: HeatCell): string {
  const attempted = countLabel(
    cell.tasksAttempted,
    activityCopy.tasksAttempted,
    activityCopy.tasksAttemptedPlural,
  )
  if (cell.tasksSolved === 0) {
    return attempted
  }
  return interpolate(activityCopy.tasksCombined, {
    attempted,
    solved: interpolate(activityCopy.tasksSolved, { count: formatInteger(cell.tasksSolved) }),
  })
}

function CellTooltip({ cell }: { cell: HeatCell }) {
  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      <span className="font-medium">{formatDate(toCalendarDate(cell.date), "date")}</span>
      {cell.value === 0 ? (
        <span className="text-fg-muted">{activityCopy.noActivity}</span>
      ) : (
        <>
          <span className="text-fg-muted">
            {countLabel(cell.queriesRun, activityCopy.queries, activityCopy.queriesPlural)}
          </span>
          <span className="text-fg-muted">{tasksLine(cell)}</span>
        </>
      )}
    </div>
  )
}

function HeatmapGrid({ model }: { model: HeatmapModel }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div
        role="img"
        aria-label={interpolate(activityCopy.ariaLabel, {
          count: formatInteger(model.totals.activeDays),
          weeks: UI_LIMITS.activityWeeks,
        })}
        className="inline-flex gap-2"
      >
        <div aria-hidden className="flex flex-col gap-[3px] pt-[18px]">
          {model.weekdays.map((date, row) => (
            <span key={row} className="h-[13px] text-2xs leading-[13px] text-fg-subtle">
              {WEEKDAY_LABEL_ROWS.includes(row)
                ? formatDate(toCalendarDate(date), "weekdayShort")
                : null}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-[3px]">
          <div aria-hidden className="flex h-[15px] gap-[3px]">
            {model.columns.map((column) => (
              <div key={column.key} className="relative w-[13px] shrink-0">
                {column.showMonth ? (
                  <span className="absolute top-0 left-0 text-2xs leading-[15px] whitespace-nowrap text-fg-muted">
                    {formatDate(toCalendarDate(column.start), "monthShort")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {model.columns.map((column) => (
              <div key={column.key} className="flex flex-col gap-[3px]">
                {column.cells.map((cell) =>
                  cell.inRange ? (
                    <Tooltip
                      key={cell.key}
                      content={<CellTooltip cell={cell} />}
                      delayDuration={TOOLTIP_DELAY_MS}
                    >
                      <div
                        className={cn(
                          CELL_CLASS,
                          HEAT_CLASS[cell.level],
                          "hover:outline hover:outline-fg-subtle",
                        )}
                      />
                    </Tooltip>
                  ) : (
                    <div key={cell.key} aria-hidden className={CELL_CLASS} />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-2xs text-fg-subtle">
      <span>{activityCopy.less}</span>
      {HEAT_LEVELS.map((level) => (
        <span key={level} aria-hidden className={cn(CELL_CLASS, HEAT_CLASS[level])} />
      ))}
      <span>{activityCopy.more}</span>
    </div>
  )
}

function ActivityStats({ model }: { model: HeatmapModel }) {
  const busiest = model.busiest
  const items = [
    {
      key: "queries",
      label: activityCopy.summary.queries,
      value: formatInteger(model.totals.queriesRun),
    },
    {
      key: "attempted",
      label: activityCopy.summary.tasksAttempted,
      value: formatInteger(model.totals.tasksAttempted),
    },
    {
      key: "solved",
      label: activityCopy.summary.tasksSolved,
      value: formatInteger(model.totals.tasksSolved),
    },
    {
      key: "busiest",
      label: activityCopy.summary.busiestDay,
      value: busiest ? formatDate(toCalendarDate(busiest.date), "shortDate") : null,
    },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:min-w-56 xl:grid-cols-2">
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 flex-col gap-0.5">
          <dt className="truncate text-xs text-fg-muted">{item.label}</dt>
          <dd className="font-mono text-md tabular text-fg">
            {item.value ?? <span className="text-fg-subtle">{EMPTY_VALUE}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function HeatmapSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-[112px] w-full max-w-[400px]" />
      <Skeleton className="h-3 w-48" />
    </div>
  )
}

export function ActivityCard({ className }: { className?: string }) {
  const query = useActivity(ACTIVITY_DAYS)
  const model = useMemo(
    () =>
      query.data
        ? buildHeatmap(query.data, UI_LIMITS.activityWeeks, UI_LIMITS.daysPerWeek, utcToday())
        : null,
    [query.data],
  )
  return (
    <Card className={className}>
      <CardHeader
        icon={<CalendarDays />}
        title={activityCopy.title}
        description={interpolate(activityCopy.description, { weeks: UI_LIMITS.activityWeeks })}
      />
      <CardBody>
        {query.isPending ? (
          <HeatmapSkeleton />
        ) : query.isError || !model ? (
          <ErrorState
            compact
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="overflow-x-auto pb-1">
                <HeatmapGrid model={model} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-fg-muted">
                  {activeDaysLabel(model.totals.activeDays)}
                </span>
                <HeatmapLegend />
              </div>
              {model.totals.activeDays === 0 ? (
                <p className="text-xs text-fg-subtle">{activityCopy.emptyHint}</p>
              ) : null}
            </div>
            <ActivityStats model={model} />
          </div>
        )}
      </CardBody>
    </Card>
  )
}
