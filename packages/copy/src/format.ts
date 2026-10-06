export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}
