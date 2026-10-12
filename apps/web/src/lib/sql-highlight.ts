import { PostgreSQL } from "@codemirror/lang-sql"
import { highlightTree, tagHighlighter, tags } from "@lezer/highlight"

export const sqlTokenHighlighter = tagHighlighter([
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: [tags.typeName, tags.standard(tags.name)], class: "tok-typeName" },
  { tag: tags.string, class: "tok-string" },
  { tag: [tags.number, tags.bool, tags.null], class: "tok-number" },
  { tag: [tags.lineComment, tags.blockComment, tags.comment], class: "tok-comment" },
  { tag: tags.operator, class: "tok-operator" },
  {
    tag: [tags.punctuation, tags.paren, tags.bracket, tags.squareBracket, tags.brace],
    class: "tok-punctuation",
  },
  { tag: tags.special(tags.string), class: "tok-variableName" },
  { tag: tags.special(tags.name), class: "tok-special" },
])

export type SqlToken = {
  text: string
  className: string | null
}

export function tokenizeSql(sql: string): SqlToken[] {
  const tree = PostgreSQL.language.parser.parse(sql)
  const tokens: SqlToken[] = []
  let position = 0
  highlightTree(tree, sqlTokenHighlighter, (from, to, classes) => {
    if (from > position) {
      tokens.push({ text: sql.slice(position, from), className: null })
    }
    tokens.push({ text: sql.slice(from, to), className: classes })
    position = to
  })
  if (position < sql.length) {
    tokens.push({ text: sql.slice(position), className: null })
  }
  return tokens
}
