export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0]
}

export const CHART_FONT_SIZE = 11

export const chartAxisProps = {
  stroke: "var(--border)",
  tick: { fill: "var(--fg-muted)", fontSize: CHART_FONT_SIZE },
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
} as const

export const chartGridProps = {
  stroke: "var(--chart-grid)",
  strokeDasharray: "3 3",
  vertical: false,
} as const

export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border-strong)",
    borderRadius: 6,
    color: "var(--fg)",
    fontSize: 12,
    padding: "6px 10px",
  },
  labelStyle: { color: "var(--fg-muted)", marginBottom: 4 },
  itemStyle: { color: "var(--fg)", padding: 0 },
  cursor: { fill: "var(--surface-2)", stroke: "var(--border-strong)" },
} as const

export const chartLegendProps = {
  iconSize: 8,
  wrapperStyle: { fontSize: CHART_FONT_SIZE, color: "var(--fg-muted)" },
} as const
