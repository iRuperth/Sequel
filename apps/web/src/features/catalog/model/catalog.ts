import type {
  CatalogColumn,
  CatalogLink,
  CatalogTableDetail,
  DatasetSummary,
} from "@sequel/contracts"

export function sortDatasets(items: readonly DatasetSummary[]): DatasetSummary[] {
  return [...items].sort(
    (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name),
  )
}

export function columnPath(schema: string, table: string, column?: string): string {
  return column ? `${schema}.${table}.${column}` : `${schema}.${table}`
}

export function linkSourcePath(link: CatalogLink): string {
  return columnPath(link.fromSchema, link.fromTable, link.fromColumn)
}

export function linkTargetPath(link: CatalogLink): string {
  return columnPath(link.toSchema, link.toTable, link.toColumn)
}

export function linkKey(link: CatalogLink): string {
  return `${linkSourcePath(link)}>${linkTargetPath(link)}:${link.kind}`
}

export function outgoingByColumn(links: readonly CatalogLink[]): Map<string, CatalogLink[]> {
  const map = new Map<string, CatalogLink[]>()
  for (const link of links) {
    const list = map.get(link.fromColumn) ?? []
    list.push(link)
    map.set(link.fromColumn, list)
  }
  return map
}

export function hasPii(columns: readonly CatalogColumn[]): boolean {
  return columns.some((column) => column.isPii)
}

export type ColumnsSummary = {
  primaryKey: CatalogColumn[]
  pii: CatalogColumn[]
  nullableCount: number
}

export function summarizeColumns(table: CatalogTableDetail): ColumnsSummary {
  return {
    primaryKey: table.columns.filter((column) => column.isPrimaryKey),
    pii: table.columns.filter((column) => column.isPii),
    nullableCount: table.columns.filter((column) => column.isNullable).length,
  }
}

export type MatchSegment = { text: string; match: boolean }

export function splitMatches(text: string, term: string): MatchSegment[] {
  const needle = term.trim().toLowerCase()
  if (!needle) {
    return [{ text, match: false }]
  }
  const haystack = text.toLowerCase()
  const segments: MatchSegment[] = []
  let cursor = 0
  let index = haystack.indexOf(needle, cursor)
  while (index >= 0) {
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), match: false })
    }
    segments.push({ text: text.slice(index, index + needle.length), match: true })
    cursor = index + needle.length
    index = haystack.indexOf(needle, cursor)
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false })
  }
  return segments
}
