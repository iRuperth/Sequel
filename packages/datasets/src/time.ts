export const MS_PER_SECOND = 1000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface Clock {
  readonly asOfDate: string
  readonly startMs: number
  readonly endMs: number
  readonly dayCount: number
}

export function parseIsoDate(value: string): number {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) {
    throw new Error(`Invalid ISO date: ${value}`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const ms = Date.UTC(year, month - 1, day)
  const check = new Date(ms)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`)
  }
  return ms
}

export function addMonthsUtc(ms: number, months: number): number {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Date.UTC(year, month, Math.min(day, lastDay)) + (ms % MS_PER_DAY)
}

export function createClock(asOfDate: string, windowMonths: number): Clock {
  const asOfStart = parseIsoDate(asOfDate)
  const startMs = addMonthsUtc(asOfStart, -windowMonths) + MS_PER_DAY
  const endMs = asOfStart + MS_PER_DAY - MS_PER_SECOND
  const dayCount = Math.round((asOfStart - startMs) / MS_PER_DAY) + 1
  return { asOfDate, startMs, endMs, dayCount }
}

export function startOfDay(ms: number): number {
  return ms - (((ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY)
}

export function dayIndexOf(clock: Clock, ms: number): number {
  return Math.floor((ms - clock.startMs) / MS_PER_DAY)
}

export function dayStartMs(clock: Clock, dayIndex: number): number {
  return clock.startMs + dayIndex * MS_PER_DAY
}

export function weekdayIndex(ms: number): number {
  return (new Date(ms).getUTCDay() + 6) % 7
}

export function monthIndex(ms: number): number {
  return new Date(ms).getUTCMonth()
}

export function yearOf(ms: number): number {
  return new Date(ms).getUTCFullYear()
}

export function clampMs(ms: number, min: number, max: number): number {
  return Math.min(Math.max(ms, min), max)
}

export function truncateToSecond(ms: number): number {
  return Math.floor(ms / MS_PER_SECOND) * MS_PER_SECOND
}

export function formatTimestamp(ms: number): string {
  const iso = new Date(truncateToSecond(ms)).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}+00`
}

export function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function daysBetween(fromMs: number, toMs: number): number {
  return Math.floor((startOfDay(toMs) - startOfDay(fromMs)) / MS_PER_DAY)
}
