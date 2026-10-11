import type { SqlError } from "@sequel/contracts"
import { copy, interpolate, rejectionReasonLabels } from "@sequel/copy"
import { CircleX, ShieldAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { errorOffsetFor, lineAndColumn } from "../model/sql-error"

function Detail({
  label,
  children,
  mono,
}: {
  label: ReactNode
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className={cn("min-w-0 break-words text-fg", mono && "font-mono text-xs")}>{children}</dd>
    </div>
  )
}

export function SqlErrorPanel({
  error,
  sql,
  base = 0,
  onReveal,
  className,
}: {
  error: SqlError
  sql?: string
  base?: number
  onReveal?: (offset: number) => void
  className?: string
}) {
  const rejected = error.rejectionReason !== null
  const Icon = rejected ? ShieldAlert : CircleX
  const offset = errorOffsetFor(error, base)
  const position = offset !== null && sql !== undefined ? lineAndColumn(sql, offset) : null
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="alert"
        className={cn(
          "flex items-start gap-2.5 rounded-md px-3 py-2.5",
          rejected ? "bg-warning/12" : "bg-danger/10",
        )}
      >
        <Icon className={cn("mt-0.5 size-4 shrink-0", rejected ? "text-warning" : "text-danger")} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("text-xs font-medium", rejected ? "text-warning" : "text-danger")}>
            {rejected ? copy.results.messages.rejected : copy.results.messages.error}
          </span>
          <span className="font-mono text-xs break-words whitespace-pre-wrap text-fg">
            {error.message}
          </span>
        </div>
      </div>
      <dl className="flex flex-col gap-2 px-1">
        {error.rejectionReason ? (
          <Detail label={copy.tasks.results.reason}>
            {rejectionReasonLabels[error.rejectionReason]}
          </Detail>
        ) : null}
        {error.sqlState ? (
          <Detail label={copy.results.messages.sqlState} mono>
            {error.sqlState}
          </Detail>
        ) : null}
        {position ? (
          <Detail label={copy.tasks.results.position} mono>
            <span className="inline-flex items-center gap-2">
              {interpolate(copy.results.messages.position, position)}
              {onReveal && offset !== null ? (
                <Button
                  size="xs"
                  variant="link"
                  className="font-sans"
                  onClick={() => onReveal(offset)}
                >
                  {copy.results.messages.showInEditor}
                </Button>
              ) : null}
            </span>
          </Detail>
        ) : null}
        {error.hint ? <Detail label={copy.results.messages.hint}>{error.hint}</Detail> : null}
        {error.detail ? (
          <Detail label={copy.results.messages.detail} mono>
            {error.detail}
          </Detail>
        ) : null}
      </dl>
    </div>
  )
}
