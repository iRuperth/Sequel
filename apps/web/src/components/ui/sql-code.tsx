import { cn } from "@/lib/cn"
import { tokenizeSql } from "@/lib/sql-highlight"

type SqlCodeProps = {
  sql: string
  className?: string
  wrap?: boolean
  maxLines?: number
}

export function SqlCode({ sql, className, wrap = false, maxLines }: SqlCodeProps) {
  const source = maxLines ? sql.split("\n").slice(0, maxLines).join("\n") : sql
  const tokens = tokenizeSql(source)
  return (
    <pre
      className={cn(
        "sql-code overflow-auto font-mono text-xs leading-5 text-fg",
        wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        className,
      )}
    >
      <code>
        {tokens.map((token, index) =>
          token.className ? (
            <span key={index} className={token.className}>
              {token.text}
            </span>
          ) : (
            token.text
          ),
        )}
      </code>
    </pre>
  )
}
