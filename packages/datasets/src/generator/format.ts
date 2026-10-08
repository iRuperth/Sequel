export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function money(cents: number): string {
  const rounded = Math.round(cents)
  const sign = rounded < 0 ? "-" : ""
  const absolute = Math.abs(rounded)
  const units = Math.floor(absolute / 100)
  const fraction = absolute % 100
  return `${sign}${units}.${fraction < 10 ? "0" : ""}${fraction}`
}

export function fixed(value: number, digits: number): string {
  return value.toFixed(digits)
}

export function roundToMinorUnits(cents: number, minorUnits: number): number {
  if (minorUnits >= 2) {
    return Math.round(cents)
  }
  const step = Math.pow(10, 2 - minorUnits)
  return Math.round(cents / step) * step
}

export function padNumber(value: number, width: number): string {
  return String(value).padStart(width, "0")
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}
