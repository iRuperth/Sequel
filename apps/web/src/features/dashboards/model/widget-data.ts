import type { CellValue, ResultSet, ValueFormat, WidgetConfig } from "@sequel/contracts"
import { DEFAULT_CURRENCY, LOCALE, copy } from "@sequel/copy"
import { cellDisplay, isNumericType, normalizeType } from "@/features/results/model/cells"
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format"
import { CHART_SERIES_KEY_PREFIX, CHART_X_KEY } from "./constants"

const TEMPORAL_TYPES = new Set(["date", "timestamp", "timestamptz"])
const TIMESTAMP_PREFIX = "timestamp"
const compactCurrencyCache = new Map<string, Intl.NumberFormat>()

export function toNumber(value: CellValue | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function currencyCode(currency: string | null): string {
  return currency?.trim() ? currency.trim().toUpperCase() : DEFAULT_CURRENCY
}

export function formatWidgetValue(
  value: CellValue | undefined,
  format: ValueFormat,
  currency: string | null,
): string {
  if (value === null || value === undefined) {
    return copy.common.nullValue
  }
  if (format === "text") {
    return cellDisplay(value)
  }
  const numeric = toNumber(value)
  if (numeric === null) {
    return cellDisplay(value)
  }
  if (format === "currency") {
    return formatCurrency(numeric, currencyCode(currency))
  }
  if (format === "percent") {
    return formatPercent(numeric)
  }
  return formatNumber(numeric)
}

function formatCompactCurrency(value: number, currency: string): string {
  let formatter = compactCurrencyCache.get(currency)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      })
    } catch {
      return formatCompact(value)
    }
    compactCurrencyCache.set(currency, formatter)
  }
  return formatter.format(value)
}

export function formatAxisValue(
  value: unknown,
  format: ValueFormat,
  currency: string | null,
): string {
  const numeric =
    typeof value === "number" ? value : toNumber(typeof value === "string" ? value : null)
  if (numeric === null) {
    return String(value ?? "")
  }
  if (format === "percent") {
    return formatPercent(numeric, true)
  }
  if (format === "currency") {
    return formatCompactCurrency(numeric, currencyCode(currency))
  }
  return formatCompact(numeric)
}

export function isTemporalType(dataType: string | null | undefined): boolean {
  const type = normalizeType(dataType)
  return TEMPORAL_TYPES.has(type) || type.startsWith(TIMESTAMP_PREFIX)
}

export function formatCategory(value: unknown, temporal: boolean, detailed = false): string {
  if (temporal && typeof value === "string") {
    return formatDate(value, detailed ? "date" : "shortDate")
  }
  return String(value ?? "")
}

function columnIndex(result: ResultSet, name: string | null): number {
  if (!name) {
    return -1
  }
  return result.columns.findIndex((column) => column.name === name)
}

export type KpiModel =
  | { status: "ready"; value: CellValue; column: string }
  | { status: "unconfigured" }
  | { status: "missing"; column: string }
  | { status: "empty" }

export function buildKpiModel(result: ResultSet, config: WidgetConfig): KpiModel {
  const column = config.valueColumn ?? result.columns[0]?.name ?? null
  if (!column) {
    return { status: "unconfigured" }
  }
  const index = columnIndex(result, column)
  if (index < 0) {
    return { status: "missing", column }
  }
  const row = result.rows[0]
  if (!row) {
    return { status: "empty" }
  }
  return { status: "ready", value: row[index] ?? null, column }
}

export type ChartPoint = Record<string, string | number | null>

export type ChartSeries = { key: string; name: string }

export type ChartModel =
  | { status: "ready"; data: ChartPoint[]; series: ChartSeries[]; temporal: boolean }
  | { status: "unconfigured" }
  | { status: "missing"; column: string }
  | { status: "empty" }

export function seriesKey(index: number): string {
  return `${CHART_SERIES_KEY_PREFIX}${index}`
}

export function buildChartModel(result: ResultSet, config: WidgetConfig): ChartModel {
  if (!config.xColumn || config.yColumns.length === 0) {
    return { status: "unconfigured" }
  }
  const xIndex = columnIndex(result, config.xColumn)
  if (xIndex < 0) {
    return { status: "missing", column: config.xColumn }
  }
  const yIndexes: number[] = []
  for (const name of config.yColumns) {
    const index = columnIndex(result, name)
    if (index < 0) {
      return { status: "missing", column: name }
    }
    yIndexes.push(index)
  }
  if (result.rows.length === 0) {
    return { status: "empty" }
  }
  const series = config.yColumns.map((name, index) => ({ key: seriesKey(index), name }))
  const data = result.rows.map((row) => {
    const xValue = row[xIndex] ?? null
    const point: ChartPoint = {
      [CHART_X_KEY]: xValue === null ? copy.common.nullValue : cellDisplay(xValue),
    }
    yIndexes.forEach((columnPosition, index) => {
      point[seriesKey(index)] = toNumber(row[columnPosition])
    })
    return point
  })
  const temporal = isTemporalType(result.columns[xIndex]?.dataType)
  return { status: "ready", data, series, temporal }
}

export type ColumnOption = { name: string; dataType: string; numeric: boolean }

export function toColumnOptions(result: ResultSet): ColumnOption[] {
  return result.columns.map((column) => ({
    name: column.name,
    dataType: column.dataType,
    numeric: isNumericType(column.dataType),
  }))
}

export function parseColumnList(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}
