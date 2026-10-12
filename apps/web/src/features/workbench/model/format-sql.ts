import { format } from "sql-formatter"

const LINES_BETWEEN_QUERIES = 2

export function formatSql(sql: string, tabWidth: number): string {
  return format(sql, {
    language: "postgresql",
    keywordCase: "upper",
    tabWidth,
    linesBetweenQueries: LINES_BETWEEN_QUERIES,
  })
}
