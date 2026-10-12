"use client"

import type { ValueFormat, WidgetKind } from "@sequel/contracts"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  chartAxisProps,
  chartColor,
  chartGridProps,
  chartLegendProps,
  chartTooltipProps,
} from "@/lib/chart-theme"
import {
  CHART_ACTIVE_DOT_RADIUS,
  CHART_AREA_FILL_OPACITY,
  CHART_BAR_CATEGORY_GAP,
  CHART_BAR_GAP,
  CHART_BAR_RADIUS,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  CHART_MAX_BAR_SIZE,
  CHART_X_KEY,
  CHART_X_TICK_GAP,
  CHART_Y_AXIS_WIDTH,
} from "../model/constants"
import {
  type ChartPoint,
  type ChartSeries,
  formatAxisValue,
  formatCategory,
  formatWidgetValue,
} from "../model/widget-data"

type WidgetChartProps = {
  kind: Exclude<WidgetKind, "kpi" | "table">
  data: ChartPoint[]
  series: ChartSeries[]
  temporal: boolean
  format: ValueFormat
  currency: string | null
}

function tooltipValue(value: unknown): string | number | null {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }
  return null
}

const ACTIVE_DOT = {
  r: CHART_ACTIVE_DOT_RADIUS,
  strokeWidth: CHART_LINE_WIDTH,
  stroke: "var(--surface)",
} as const

export function WidgetChart({ kind, data, series, temporal, format, currency }: WidgetChartProps) {
  const showLegend = series.length > 1
  return (
    <div className="h-full min-h-0 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={CHART_MARGIN}
          barCategoryGap={CHART_BAR_CATEGORY_GAP}
          barGap={CHART_BAR_GAP}
        >
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey={CHART_X_KEY}
            {...chartAxisProps}
            minTickGap={CHART_X_TICK_GAP}
            tickFormatter={(value: unknown) => formatCategory(value, temporal)}
          />
          <YAxis
            {...chartAxisProps}
            axisLine={false}
            width={CHART_Y_AXIS_WIDTH}
            tickFormatter={(value: unknown) => formatAxisValue(value, format, currency)}
          />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value) => formatWidgetValue(tooltipValue(value), format, currency)}
            labelFormatter={(label) => formatCategory(label, temporal, true)}
          />
          {showLegend ? (
            <Legend
              {...chartLegendProps}
              formatter={(value) => <span className="text-fg-muted">{value}</span>}
            />
          ) : null}
          {series.map((item, index) => {
            const color = chartColor(index)
            if (kind === "bar") {
              return (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.name}
                  fill={color}
                  radius={CHART_BAR_RADIUS}
                  maxBarSize={CHART_MAX_BAR_SIZE}
                  isAnimationActive={false}
                />
              )
            }
            if (kind === "area") {
              return (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={color}
                  strokeWidth={CHART_LINE_WIDTH}
                  fill={color}
                  fillOpacity={CHART_AREA_FILL_OPACITY}
                  activeDot={ACTIVE_DOT}
                  connectNulls
                  isAnimationActive={false}
                />
              )
            }
            return (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={color}
                strokeWidth={CHART_LINE_WIDTH}
                dot={false}
                activeDot={ACTIVE_DOT}
                connectNulls
                isAnimationActive={false}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
