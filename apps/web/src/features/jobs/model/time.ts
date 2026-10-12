import { DEFAULT_TIMEZONE } from "./constants"

function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    return []
  }
}

export function listTimezones(current?: string | null): string[] {
  const zones = supportedTimezones()
  const ordered = new Set<string>([DEFAULT_TIMEZONE])
  if (current) {
    ordered.add(current)
  }
  for (const zone of zones) {
    ordered.add(zone)
  }
  return [...ordered]
}

export function durationBetween(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) {
    return null
  }
  const diff = Date.parse(end) - Date.parse(start)
  return Number.isFinite(diff) && diff >= 0 ? diff : null
}
