const WHITESPACE = /\s+/g

export function sqlPreview(sql: string): string {
  return sql.replace(WHITESPACE, " ").trim()
}
