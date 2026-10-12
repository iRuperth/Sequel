import {
  type UpsertWidgetRequest,
  type ValueFormat,
  type Widget,
  type WidgetKind,
  type WidgetPosition,
} from "@sequel/contracts"
import {
  DEFAULT_VALUE_FORMAT,
  DEFAULT_WIDGET_KIND,
  SUGGESTED_SERIES_COUNT,
  WIDGET_DEFAULT_SIZE,
} from "./constants"
import { clampPosition, defaultPosition } from "./layout"
import { type ColumnOption, parseColumnList } from "./widget-data"

export type PositionText = Record<keyof WidgetPosition, string>

export type WidgetFormState = {
  title: string
  savedQueryId: string
  kind: WidgetKind
  xColumn: string
  yColumns: string[]
  yColumnsText: string
  valueColumn: string
  format: ValueFormat
  currency: string
  position: PositionText
  positionTouched: boolean
}

export type ColumnMode = "none" | "loading" | "select" | "text"

export type WidgetFormErrors = Partial<
  Record<"title" | "savedQueryId" | "xColumn" | "yColumns" | "valueColumn", true>
>

export const CHART_KINDS: readonly WidgetKind[] = ["line", "bar", "area"]

export function isChartKind(kind: WidgetKind): kind is "line" | "bar" | "area" {
  return CHART_KINDS.includes(kind)
}

function positionToText(position: WidgetPosition): PositionText {
  return {
    x: String(position.x),
    y: String(position.y),
    w: String(position.w),
    h: String(position.h),
  }
}

export function textToPosition(text: PositionText): WidgetPosition {
  return clampPosition({
    x: Number.parseInt(text.x, 10),
    y: Number.parseInt(text.y, 10),
    w: Number.parseInt(text.w, 10),
    h: Number.parseInt(text.h, 10),
  })
}

export function initialWidgetForm(
  widget: Widget | null,
  widgets: readonly Widget[],
): WidgetFormState {
  if (widget) {
    return {
      title: widget.title,
      savedQueryId: widget.savedQueryId,
      kind: widget.kind,
      xColumn: widget.config.xColumn ?? "",
      yColumns: [...widget.config.yColumns],
      yColumnsText: widget.config.yColumns.join(", "),
      valueColumn: widget.config.valueColumn ?? "",
      format: widget.config.format,
      currency: widget.config.currency ?? "",
      position: positionToText(widget.position),
      positionTouched: true,
    }
  }
  return {
    title: "",
    savedQueryId: "",
    kind: DEFAULT_WIDGET_KIND,
    xColumn: "",
    yColumns: [],
    yColumnsText: "",
    valueColumn: "",
    format: DEFAULT_VALUE_FORMAT,
    currency: "",
    position: positionToText(defaultPosition(DEFAULT_WIDGET_KIND, widgets)),
    positionTouched: false,
  }
}

export function withKind(state: WidgetFormState, kind: WidgetKind): WidgetFormState {
  if (state.positionTouched) {
    return { ...state, kind }
  }
  const size = WIDGET_DEFAULT_SIZE[kind]
  return { ...state, kind, position: { ...state.position, w: String(size.w), h: String(size.h) } }
}

export function withColumnDefaults(
  state: WidgetFormState,
  columns: readonly ColumnOption[],
): WidgetFormState {
  const first = columns[0]
  if (!first) {
    return state
  }
  const numeric = columns.filter((column) => column.numeric)
  const xColumn = state.xColumn || (columns.find((column) => !column.numeric) ?? first).name
  const yColumns =
    state.yColumns.length > 0
      ? state.yColumns
      : numeric
          .filter((column) => column.name !== xColumn)
          .slice(0, SUGGESTED_SERIES_COUNT)
          .map((column) => column.name)
  const valueColumn = state.valueColumn || (numeric[0] ?? first).name
  return {
    ...state,
    xColumn,
    yColumns,
    yColumnsText: state.yColumnsText || yColumns.join(", "),
    valueColumn,
  }
}

function seriesFor(state: WidgetFormState, mode: ColumnMode): string[] {
  return mode === "text" ? parseColumnList(state.yColumnsText) : state.yColumns
}

export function validateWidgetForm(state: WidgetFormState, mode: ColumnMode): WidgetFormErrors {
  const errors: WidgetFormErrors = {}
  if (!state.title.trim()) {
    errors.title = true
  }
  if (!state.savedQueryId) {
    errors.savedQueryId = true
  }
  if (state.kind === "kpi" && !state.valueColumn.trim()) {
    errors.valueColumn = true
  }
  if (isChartKind(state.kind)) {
    if (!state.xColumn.trim()) {
      errors.xColumn = true
    }
    if (seriesFor(state, mode).length === 0) {
      errors.yColumns = true
    }
  }
  return errors
}

export function toWidgetRequest(state: WidgetFormState, mode: ColumnMode): UpsertWidgetRequest {
  const chart = isChartKind(state.kind)
  const currency = state.currency.trim().toUpperCase()
  return {
    title: state.title.trim(),
    kind: state.kind,
    savedQueryId: state.savedQueryId,
    config: {
      xColumn: chart ? state.xColumn.trim() : null,
      yColumns: chart ? seriesFor(state, mode) : [],
      valueColumn: state.kind === "kpi" ? state.valueColumn.trim() : null,
      format: state.format,
      currency: state.format === "currency" && currency ? currency : null,
    },
    position: textToPosition(state.position),
  }
}
