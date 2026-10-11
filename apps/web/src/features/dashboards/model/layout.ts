import { LIMITS, type Widget, type WidgetKind, type WidgetPosition } from "@sequel/contracts"
import { WIDGET_DEFAULT_SIZE, WIDGET_MAX_ROWS } from "./constants"

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(Math.max(Math.round(value), min), max)
}

export function nextFreeRow(widgets: readonly Widget[]): number {
  return widgets.reduce((max, widget) => Math.max(max, widget.position.y + widget.position.h), 0)
}

export function defaultPosition(kind: WidgetKind, widgets: readonly Widget[]): WidgetPosition {
  return { x: 0, y: nextFreeRow(widgets), ...WIDGET_DEFAULT_SIZE[kind] }
}

export function clampPosition(position: WidgetPosition): WidgetPosition {
  const w = clamp(position.w, 1, LIMITS.widgetGridColumns)
  return {
    x: clamp(position.x, 0, LIMITS.widgetGridColumns - w),
    y: clamp(position.y, 0, Number.MAX_SAFE_INTEGER),
    w,
    h: clamp(position.h, 1, WIDGET_MAX_ROWS),
  }
}

export function sortByPosition(widgets: readonly Widget[]): Widget[] {
  return [...widgets].sort(
    (left, right) => left.position.y - right.position.y || left.position.x - right.position.x,
  )
}
