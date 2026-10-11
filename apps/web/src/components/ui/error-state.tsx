"use client"

import { copy } from "@sequel/copy"
import { RefreshCw, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/config/routes"
import { describeError } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { Button } from "./button"

type ErrorStateProps = {
  error: unknown
  title?: string
  onRetry?: () => void
  retrying?: boolean
  compact?: boolean
  className?: string
}

export function ErrorState({
  error,
  title = copy.states.errorTitle,
  onRetry,
  retrying = false,
  compact = false,
  className,
}: ErrorStateProps) {
  const described = describeError(error)
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-danger/12 text-danger",
          compact ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5",
        )}
      >
        <TriangleAlert />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <p className={cn("font-medium text-fg", compact ? "text-sm" : "text-base")}>{title}</p>
        <p className="text-sm text-fg-muted">{described.message}</p>
        {described.detail ? (
          <p className="font-mono text-xs break-words text-fg-subtle">{described.detail}</p>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {onRetry ? (
          <Button size="sm" onClick={onRetry} loading={retrying}>
            {retrying ? null : <RefreshCw />}
            {copy.actions.retry}
          </Button>
        ) : null}
        {compact ? null : (
          <Button size="sm" variant="ghost" asChild>
            <Link href={ROUTES.status}>{copy.shell.health.viewStatus}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export function InlineError({ error, className }: { error: unknown; className?: string }) {
  const described = describeError(error)
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span>{described.message}</span>
        {described.detail ? (
          <span className="font-mono text-xs break-words text-danger/80">{described.detail}</span>
        ) : null}
      </div>
    </div>
  )
}
