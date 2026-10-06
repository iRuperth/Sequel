import { hasSqlDetails, loadModule, parseSync } from "libpg-query"
import { byteSpanToCharSpan } from "./text"

export type AstNode = Record<string, unknown>

export type ParsedStatement = {
  kind: string
  node: AstNode
  text: string
  start: number
  end: number
}

export type ParseOutcome =
  | { ok: true; statements: ParsedStatement[] }
  | { ok: false; message: string; position: number | null }

export interface SqlParser {
  ready(): Promise<void>
  parse(sql: string): ParseOutcome
}

type RawStatement = { stmt?: AstNode; stmt_location?: number; stmt_len?: number }

export class LibpgQueryParser implements SqlParser {
  private loading: Promise<void> | undefined

  ready(): Promise<void> {
    this.loading ??= loadModule()
    return this.loading
  }

  parse(sql: string): ParseOutcome {
    try {
      const result = parseSync(sql) as { stmts?: RawStatement[] }
      const statements = (result.stmts ?? []).flatMap((raw) => {
        const wrapper = raw.stmt
        if (!wrapper) {
          return []
        }
        const kind = Object.keys(wrapper)[0]
        if (!kind) {
          return []
        }
        const span = byteSpanToCharSpan(sql, raw.stmt_location ?? 0, raw.stmt_len ?? null)
        const text = sql.slice(span.start, span.end).trim()
        const leading = sql.slice(span.start, span.end).search(/\S/)
        const start = span.start + Math.max(0, leading)
        return [{ kind, node: wrapper[kind] as AstNode, text, start, end: start + text.length }]
      })
      return { ok: true, statements }
    } catch (error) {
      if (hasSqlDetails(error) && error.sqlDetails) {
        return {
          ok: false,
          message: error.sqlDetails.message,
          position: error.sqlDetails.cursorPosition + 1,
        }
      }
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        position: null,
      }
    }
  }
}
