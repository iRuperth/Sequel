import { randomBytes } from "node:crypto"

export function shortId(bytes = 4): string {
  return randomBytes(bytes).toString("hex")
}

export function quoteIdent(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function qualified(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`
}
