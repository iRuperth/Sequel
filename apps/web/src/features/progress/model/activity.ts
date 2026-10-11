import type { ActivityDay } from "@sequel/contracts"

const MS_PER_DAY = 86_400_000
const ISO_DAY_LENGTH = 10

export const HEAT_LEVEL_COUNT = 4
export const MONTH_LABEL_MIN_GAP = 3
export const WEEKDAY_LABEL_ROWS: readonly number[] = [1, 3, 5]

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export const HEAT_LEVELS: readonly HeatLevel[] = [0, 1, 2, 3, 4]

export type HeatCell = {
  key: string
  date: Date
  queriesRun: number
  tasksAttempted: number
  tasksSolved: number
  value: number
  level: HeatLevel
  inRange: boolean
}

export type HeatColumn = {
  key: string
  start: Date
  cells: HeatCell[]
  showMonth: boolean
}

export type HeatmapTotals = {
  queriesRun: number
  tasksAttempted: number
  tasksSolved: number
  activeDays: number
}

export type HeatmapModel = {
  columns: HeatColumn[]
  weekdays: Date[]
  totals: HeatmapTotals
  busiest: HeatCell | null
}

export function utcToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, ISO_DAY_LENGTH)
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export function toCalendarDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function heatLevel(value: number, max: number): HeatLevel {
  if (value <= 0 || max <= 0) {
    return 0
  }
  const level = Math.ceil((value / max) * HEAT_LEVEL_COUNT)
  return Math.min(HEAT_LEVEL_COUNT, Math.max(1, level)) as HeatLevel
}

function monthLabelColumns(starts: readonly Date[]): Set<number> {
  const candidates = starts
    .map((start, index) => ({ start, index }))
    .filter(
      ({ start, index }) => index === 0 || start.getUTCMonth() !== starts[index - 1]?.getUTCMonth(),
    )
    .map(({ index }) => index)
  const labelled = new Set<number>()
  let previous = Number.NEGATIVE_INFINITY
  candidates.forEach((index, position) => {
    if (index === 0) {
      const next = candidates[position + 1]
      if (next !== undefined && next < MONTH_LABEL_MIN_GAP) {
        return
      }
    }
    if (index - previous >= MONTH_LABEL_MIN_GAP) {
      labelled.add(index)
      previous = index
    }
  })
  return labelled
}

export function buildHeatmap(
  items: readonly ActivityDay[],
  weeks: number,
  daysPerWeek: number,
  today: Date,
): HeatmapModel {
  const byDay = new Map(items.map((item) => [item.day.slice(0, ISO_DAY_LENGTH), item]))
  const lastWeekStart = addUtcDays(today, -today.getUTCDay())
  const firstWeekStart = addUtcDays(lastWeekStart, -(weeks - 1) * daysPerWeek)
  const todayTime = today.getTime()
  const starts = Array.from({ length: weeks }, (_, week) =>
    addUtcDays(firstWeekStart, week * daysPerWeek),
  )
  const rawColumns = starts.map((start) =>
    Array.from({ length: daysPerWeek }, (_, offset): HeatCell => {
      const date = addUtcDays(start, offset)
      const key = utcDayKey(date)
      const entry = byDay.get(key)
      const queriesRun = entry?.queriesRun ?? 0
      const tasksAttempted = entry?.tasksAttempted ?? 0
      const tasksSolved = entry?.tasksSolved ?? 0
      return {
        key,
        date,
        queriesRun,
        tasksAttempted,
        tasksSolved,
        value: queriesRun + tasksAttempted,
        level: 0,
        inRange: date.getTime() <= todayTime,
      }
    }),
  )
  const inRange = rawColumns.flat().filter((cell) => cell.inRange)
  const max = inRange.reduce((current, cell) => Math.max(current, cell.value), 0)
  const labelled = monthLabelColumns(starts)
  const columns = rawColumns.map((cells, index) => ({
    key: utcDayKey(starts[index] ?? today),
    start: starts[index] ?? today,
    cells: cells.map((cell) => ({ ...cell, level: heatLevel(cell.value, max) })),
    showMonth: labelled.has(index),
  }))
  const totals = inRange.reduce<HeatmapTotals>(
    (sum, cell) => ({
      queriesRun: sum.queriesRun + cell.queriesRun,
      tasksAttempted: sum.tasksAttempted + cell.tasksAttempted,
      tasksSolved: sum.tasksSolved + cell.tasksSolved,
      activeDays: sum.activeDays + (cell.value > 0 ? 1 : 0),
    }),
    { queriesRun: 0, tasksAttempted: 0, tasksSolved: 0, activeDays: 0 },
  )
  const busiest = inRange.reduce<HeatCell | null>(
    (best, cell) => (cell.value > 0 && (!best || cell.value > best.value) ? cell : best),
    null,
  )
  const weekdays = Array.from({ length: daysPerWeek }, (_, offset) =>
    addUtcDays(firstWeekStart, offset),
  )
  return { columns, weekdays, totals, busiest }
}
