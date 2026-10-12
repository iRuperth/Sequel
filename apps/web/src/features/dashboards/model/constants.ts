import type { WidgetKind, WidgetPosition } from "@sequel/contracts"

export const WIDGET_DEFAULT_SIZE: Record<WidgetKind, Pick<WidgetPosition, "w" | "h">> = {
  kpi: { w: 3, h: 2 },
  line: { w: 6, h: 4 },
  bar: { w: 6, h: 4 },
  area: { w: 6, h: 4 },
  table: { w: 12, h: 4 },
}

export const WIDGET_MAX_ROWS = 12
export const COLUMN_PROBE_STALE_MS = 300_000
export const DASHBOARD_SKELETON_CARDS = 6
export const WIDGET_SKELETON_ROWS = 6

export const CHART_X_KEY = "x"
export const CHART_SERIES_KEY_PREFIX = "s"
export const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const
export const CHART_Y_AXIS_WIDTH = 52
export const CHART_LINE_WIDTH = 2
export const CHART_ACTIVE_DOT_RADIUS = 4
export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
export const CHART_MAX_BAR_SIZE = 36
export const CHART_BAR_CATEGORY_GAP = "18%"
export const CHART_BAR_GAP = 2
export const CHART_AREA_FILL_OPACITY = 0.16
export const CHART_X_TICK_GAP = 16

export const DEFAULT_WIDGET_KIND: WidgetKind = "line"
export const DEFAULT_VALUE_FORMAT = "number" as const
export const SUGGESTED_SERIES_COUNT = 1
export const CURRENCY_CODE_LENGTH = 3
