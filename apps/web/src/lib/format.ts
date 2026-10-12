import {
  BYTE_UNITS,
  DATE_FORMATS,
  DEFAULT_CURRENCY,
  DURATION_UNITS,
  LOCALE,
  NUMBER_FORMATS,
  copy,
} from "@sequel/copy"

const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000
const BYTES_PER_UNIT = 1_024
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600
const SECONDS_PER_DAY = 86_400

const numberFormatCache = new Map<string, Intl.NumberFormat>()
const dateFormatCache = new Map<string, Intl.DateTimeFormat>()
let relativeFormat: Intl.RelativeTimeFormat | null = null

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options)
  let formatter = numberFormatCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options)
    numberFormatCache.set(key, formatter)
  }
  return formatter
}

function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options)
  let formatter = dateFormatCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, options)
    dateFormatCache.set(key, formatter)
  }
  return formatter
}

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value)
}

export const EMPTY_VALUE = copy.common.notAvailable

export type NumberStyle = keyof typeof NUMBER_FORMATS

export function formatNumber(
  value: number | null | undefined,
  style: NumberStyle = "decimal",
): string {
  if (isMissing(value)) {
    return EMPTY_VALUE
  }
  return numberFormat(NUMBER_FORMATS[style]).format(value)
}

export function formatInteger(value: number | null | undefined): string {
  return formatNumber(value, "integer")
}

export function formatCompact(value: number | null | undefined): string {
  return formatNumber(value, "compact")
}

export function formatPercent(fraction: number | null | undefined, whole = false): string {
  return formatNumber(fraction, whole ? "percentWhole" : "percent")
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (isMissing(value)) {
    return EMPTY_VALUE
  }
  try {
    return numberFormat({ style: "currency", currency, maximumFractionDigits: 2 }).format(value)
  } catch {
    return numberFormat(NUMBER_FORMATS.decimal).format(value)
  }
}

function formatUnit(value: number, unit: string, maximumFractionDigits: number): string {
  return numberFormat({ style: "unit", unit, unitDisplay: "narrow", maximumFractionDigits }).format(
    value,
  )
}

export function formatDuration(ms: number | null | undefined): string {
  if (isMissing(ms)) {
    return EMPTY_VALUE
  }
  if (ms < MS_PER_SECOND) {
    return formatUnit(ms, DURATION_UNITS.millisecond, ms < 10 ? 1 : 0)
  }
  if (ms < MS_PER_MINUTE) {
    return formatUnit(ms / MS_PER_SECOND, DURATION_UNITS.second, 2)
  }
  if (ms < MS_PER_HOUR) {
    return formatUnit(ms / MS_PER_MINUTE, DURATION_UNITS.minute, 1)
  }
  if (ms < MS_PER_DAY) {
    return formatUnit(ms / MS_PER_HOUR, DURATION_UNITS.hour, 1)
  }
  return formatUnit(ms / MS_PER_DAY, DURATION_UNITS.day, 1)
}

export function formatUptime(totalSeconds: number | null | undefined): string {
  if (isMissing(totalSeconds)) {
    return EMPTY_VALUE
  }
  const days = Math.floor(totalSeconds / SECONDS_PER_DAY)
  const hours = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = Math.floor(totalSeconds % SECONDS_PER_MINUTE)
  const parts: string[] = []
  if (days > 0) {
    parts.push(formatUnit(days, DURATION_UNITS.day, 0))
  }
  if (hours > 0 || days > 0) {
    parts.push(formatUnit(hours, DURATION_UNITS.hour, 0))
  }
  if (days === 0) {
    parts.push(formatUnit(minutes, DURATION_UNITS.minute, 0))
  }
  if (days === 0 && hours === 0) {
    parts.push(formatUnit(seconds, DURATION_UNITS.second, 0))
  }
  return parts.join(" ")
}

export function formatBytes(bytes: number | null | undefined): string {
  if (isMissing(bytes)) {
    return EMPTY_VALUE
  }
  let value = bytes
  let index = 0
  while (value >= BYTES_PER_UNIT && index < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT
    index += 1
  }
  return formatUnit(value, BYTE_UNITS[index] ?? BYTE_UNITS[0], index === 0 ? 0 : 1)
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export type DateStyle = keyof typeof DATE_FORMATS

export function formatDate(
  value: string | number | Date | null | undefined,
  style: DateStyle = "date",
): string {
  const date = toDate(value)
  return date ? dateFormat(DATE_FORMATS[style]).format(date) : EMPTY_VALUE
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  return formatDate(value, "dateTime")
}

const RELATIVE_STEPS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * MS_PER_DAY },
  { unit: "month", ms: 30 * MS_PER_DAY },
  { unit: "week", ms: 7 * MS_PER_DAY },
  { unit: "day", ms: MS_PER_DAY },
  { unit: "hour", ms: MS_PER_HOUR },
  { unit: "minute", ms: MS_PER_MINUTE },
  { unit: "second", ms: MS_PER_SECOND },
]

export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(value)
  if (!date) {
    return EMPTY_VALUE
  }
  relativeFormat ??= new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" })
  const diff = date.getTime() - now
  const abs = Math.abs(diff)
  for (const step of RELATIVE_STEPS) {
    if (abs >= step.ms || step.unit === "second") {
      return relativeFormat.format(Math.round(diff / step.ms), step.unit)
    }
  }
  return relativeFormat.format(0, "second")
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
