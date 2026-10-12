"use client"

import type { SqlError, Widget, WidgetData, WidgetKind } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { CircleDashed, type LucideIcon, TriangleAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StaticGrid } from "@/features/results/components/static-grid"
import { cn } from "@/lib/cn"
import { WIDGET_SKELETON_ROWS } from "../model/constants"
import { buildChartModel, buildKpiModel, formatWidgetValue } from "../model/widget-data"
import { WidgetChart } from "./widget-chart"

type WidgetBodyProps = {
  widget: Widget
  data: WidgetData | null
  loading: boolean
  error: unknown
}

export function WidgetBody({ widget, data, loading, error }: WidgetBodyProps) {
  if (loading) {
    return <WidgetSkeleton kind={widget.kind} />
  }
  if (error) {
    return (
      <WidgetMessage
        icon={TriangleAlert}
        tone="danger"
        text={copy.dashboards.detail.dataUnavailable}
      />
    )
  }
  if (data?.error) {
    return <WidgetSqlError error={data.error} />
  }
  if (!data?.result) {
    return <WidgetMessage icon={CircleDashed} text={copy.dashboards.widget.noResult} />
  }
  const result = data.result
  const { config } = widget
  if (widget.kind === "table") {
    return (
      <StaticGrid
        columns={result.columns}
        rows={result.rows}
        showTypes={false}
        className="h-full"
        maxHeightClass="max-h-full"
      />
    )
  }
  if (widget.kind === "kpi") {
    const model = buildKpiModel(result, config)
    if (model.status === "ready") {
      return (
        <div className="flex h-full min-h-0 flex-col justify-end gap-1">
          <div
            className="truncate font-mono text-2xl font-medium tracking-tight tabular text-fg"
            title={formatWidgetValue(model.value, config.format, config.currency)}
          >
            {formatWidgetValue(model.value, config.format, config.currency)}
          </div>
          <div className="truncate font-mono text-xs text-fg-subtle">{model.column}</div>
        </div>
      )
    }
    return <ModelMessage status={model.status} column={"column" in model ? model.column : null} />
  }
  const model = buildChartModel(result, config)
  if (model.status !== "ready") {
    return <ModelMessage status={model.status} column={"column" in model ? model.column : null} />
  }
  return (
    <WidgetChart
      kind={widget.kind}
      data={model.data}
      series={model.series}
      temporal={model.temporal}
      format={config.format}
      currency={config.currency}
    />
  )
}

function ModelMessage({
  status,
  column,
}: {
  status: "unconfigured" | "missing" | "empty"
  column: string | null
}) {
  if (status === "empty") {
    return <WidgetMessage icon={CircleDashed} text={copy.dashboards.widget.noRows} />
  }
  if (status === "missing" && column) {
    return (
      <WidgetMessage
        icon={TriangleAlert}
        tone="warning"
        text={interpolate(copy.dashboards.widget.missingColumn, { column })}
      />
    )
  }
  return <WidgetMessage icon={CircleDashed} text={copy.dashboards.widget.missingConfig} />
}

const MESSAGE_TONE_CLASS = {
  muted: "text-fg-muted",
  warning: "text-warning",
  danger: "text-danger",
} as const

function WidgetMessage({
  icon: Icon,
  text,
  tone = "muted",
}: {
  icon: LucideIcon
  text: string
  tone?: keyof typeof MESSAGE_TONE_CLASS
}) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1.5 px-2 text-center">
      <Icon className={cn("size-4 shrink-0", MESSAGE_TONE_CLASS[tone])} />
      <p className={cn("line-clamp-3 text-xs", MESSAGE_TONE_CLASS[tone])}>{text}</p>
    </div>
  )
}

function WidgetSqlError({ error }: { error: SqlError }) {
  return (
    <div
      role="alert"
      className="flex h-full min-h-0 flex-col justify-center gap-1 overflow-hidden rounded-md bg-danger/8 px-3 py-2"
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
        <TriangleAlert className="size-3.5 shrink-0" />
        {copy.dashboards.widget.queryFailed}
      </span>
      <p
        className="line-clamp-3 font-mono text-2xs break-words text-fg-muted"
        title={error.message}
      >
        {error.message}
      </p>
      {error.hint ? <p className="line-clamp-2 text-2xs text-fg-subtle">{error.hint}</p> : null}
    </div>
  )
}

function WidgetSkeleton({ kind }: { kind: WidgetKind }) {
  if (kind === "kpi") {
    return (
      <div className="flex h-full flex-col justify-end gap-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    )
  }
  if (kind === "table") {
    return (
      <div className="flex h-full flex-col gap-1.5 overflow-hidden">
        {Array.from({ length: WIDGET_SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full shrink-0" />
        ))}
      </div>
    )
  }
  return <Skeleton className="h-full w-full" />
}
