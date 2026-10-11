import { copy } from "@sequel/copy"

export const MORNING_START_HOUR = 5
export const AFTERNOON_START_HOUR = 12
export const EVENING_START_HOUR = 18

export type DayPeriod = "morning" | "afternoon" | "evening"

export function dayPeriod(hour: number): DayPeriod {
  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) {
    return "morning"
  }
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) {
    return "afternoon"
  }
  return "evening"
}

const GREETINGS: Record<DayPeriod, string> = {
  morning: copy.home.greeting.morning,
  afternoon: copy.home.greeting.afternoon,
  evening: copy.home.greeting.evening,
}

export function greeting(hour: number): string {
  return GREETINGS[dayPeriod(hour)]
}
