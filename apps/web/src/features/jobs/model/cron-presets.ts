import { copy } from "@sequel/copy"

export const CRON_PRESETS = {
  every15Minutes: "*/15 * * * *",
  hourly: "0 * * * *",
  dailyAt6: "0 6 * * *",
  weekdaysAt8: "0 8 * * 1-5",
  weeklyMonday: "0 6 * * 1",
} as const

export type CronPresetId = keyof typeof CRON_PRESETS

export const CUSTOM_CRON = "custom"

export type CronChoice = CronPresetId | typeof CUSTOM_CRON

export const CRON_PRESET_IDS = Object.keys(CRON_PRESETS) as CronPresetId[]

export const DEFAULT_CRON_PRESET: CronPresetId = "dailyAt6"

export function normalizeCron(expression: string): string {
  return expression.trim().split(/\s+/).join(" ")
}

export function matchCronPreset(expression: string | null | undefined): CronPresetId | null {
  if (!expression) {
    return null
  }
  const normalized = normalizeCron(expression)
  return CRON_PRESET_IDS.find((id) => CRON_PRESETS[id] === normalized) ?? null
}

export function cronPresetLabel(expression: string | null | undefined): string | null {
  const preset = matchCronPreset(expression)
  return preset ? copy.jobs.cronPresets[preset] : null
}
