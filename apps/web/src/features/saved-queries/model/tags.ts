import type { SavedQuery } from "@sequel/contracts"

const TAG_SEPARATOR = ","
export const TAG_JOINER = ", "

export function parseTags(input: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of input.split(TAG_SEPARATOR)) {
    const tag = part.trim()
    const key = tag.toLowerCase()
    if (tag && !seen.has(key)) {
      seen.add(key)
      tags.push(tag)
    }
  }
  return tags
}

export function formatTags(tags: readonly string[]): string {
  return tags.join(TAG_JOINER)
}

export type TagCount = { tag: string; count: number }

export function collectTags(items: readonly SavedQuery[]): TagCount[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag))
}

export function matchesTags(item: SavedQuery, selected: readonly string[]): boolean {
  return selected.every((tag) => item.tags.includes(tag))
}
