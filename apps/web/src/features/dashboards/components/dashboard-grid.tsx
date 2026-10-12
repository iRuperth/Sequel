"use client"

import { LIMITS, type Widget, type WidgetData } from "@sequel/contracts"
import { type CSSProperties, useMemo } from "react"
import { LAYOUT } from "@/config/constants"
import { sortByPosition } from "../model/layout"
import { WidgetCard } from "./widget-card"

type DashboardGridProps = {
  widgets: readonly Widget[]
  data: readonly WidgetData[] | undefined
  loading: boolean
  error: unknown
  onEdit: (widget: Widget) => void
  onDelete: (widget: Widget) => void
}

const GRID_STYLE = {
  "--dashboard-columns": `repeat(${LIMITS.widgetGridColumns}, minmax(0, 1fr))`,
  "--dashboard-row": `${LAYOUT.dashboardRowHeight}px`,
} as CSSProperties

function cellStyle(widget: Widget): CSSProperties {
  const { x, y, w, h } = widget.position
  return {
    "--widget-column": `${x + 1} / span ${w}`,
    "--widget-row": `${y + 1} / span ${h}`,
    "--widget-height": `${h * LAYOUT.dashboardRowHeight}px`,
  } as CSSProperties
}

export function DashboardGrid({
  widgets,
  data,
  loading,
  error,
  onEdit,
  onDelete,
}: DashboardGridProps) {
  const sorted = useMemo(() => sortByPosition(widgets), [widgets])
  const dataById = useMemo(() => new Map((data ?? []).map((item) => [item.widgetId, item])), [data])
  return (
    <div
      style={GRID_STYLE}
      className="grid grid-cols-1 gap-3 lg:[grid-auto-rows:var(--dashboard-row)] lg:[grid-template-columns:var(--dashboard-columns)]"
    >
      {sorted.map((widget) => (
        <div
          key={widget.id}
          style={cellStyle(widget)}
          className="h-[var(--widget-height)] min-w-0 lg:h-auto lg:[grid-column:var(--widget-column)] lg:[grid-row:var(--widget-row)]"
        >
          <WidgetCard
            widget={widget}
            data={dataById.get(widget.id) ?? null}
            loading={loading}
            error={data ? null : error}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}
