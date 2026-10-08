export const iso = (value: Date): string => value.toISOString()

export const isoOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null

export const utcDay = (value: Date = new Date()): string => value.toISOString().slice(0, 10)

export const addHours = (value: Date, hours: number): Date =>
  new Date(value.getTime() + hours * 3_600_000)

export const addDays = (value: Date, days: number): Date =>
  new Date(value.getTime() + days * 86_400_000)
