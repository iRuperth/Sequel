import { CronExpressionParser } from "cron-parser"
import { invalid } from "../../shared/errors"

export function nextRun(expression: string, timezone: string, from: Date = new Date()): Date {
  try {
    return CronExpressionParser.parse(expression, { tz: timezone, currentDate: from })
      .next()
      .toDate()
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : String(error))
  }
}

export function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone })
  } catch {
    throw invalid(timezone)
  }
}
