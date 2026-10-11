import { LIMITS, type Preferences, type SandboxSessionStatus } from "@sequel/contracts"
import type { Tone } from "@/lib/tones"

export const TAB_SIZE_CHOICES: readonly number[] = [2, 4, 8]
export const PREVIEW_LINE_HEIGHT_RATIO = 1.6

export const sandboxStatusTone: Record<SandboxSessionStatus, Tone> = {
  active: "success",
  expired: "warning",
  dropped: "neutral",
}

function range(min: number, max: number): number[] {
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index)
}

function withCurrent(options: readonly number[], current: number): number[] {
  const values = new Set([...options, current])
  return [...values].sort((left, right) => left - right)
}

export function fontSizeChoices(current: number): number[] {
  return withCurrent(range(LIMITS.editorFontSizeMin, LIMITS.editorFontSizeMax), current)
}

export function tabSizeChoices(current: number): number[] {
  const allowed = TAB_SIZE_CHOICES.filter(
    (size) => size >= LIMITS.editorTabSizeMin && size <= LIMITS.editorTabSizeMax,
  )
  return withCurrent(allowed, current)
}

export function pageSizeChoices(current: number): number[] {
  return withCurrent(LIMITS.resultPageSizes, current)
}

export function changedPreferences(base: Preferences, values: Preferences): Partial<Preferences> {
  const keys = Object.keys(values) as (keyof Preferences)[]
  return Object.fromEntries(
    keys.filter((key) => values[key] !== base[key]).map((key) => [key, values[key]]),
  ) as Partial<Preferences>
}
