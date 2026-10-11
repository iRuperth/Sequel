export function firstSqlLine(sql: string): string {
  const line = sql
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0)
  return line ?? sql.trim()
}
