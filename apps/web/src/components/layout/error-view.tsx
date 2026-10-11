"use client"

import { copy } from "@sequel/copy"
import { House, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { ROUTES } from "@/config/routes"
import { SystemPage } from "./system-page"

type ErrorViewProps = {
  digest?: string
  onRetry: () => void
  standalone?: boolean
  title?: string
  description?: string
}

export function ErrorView({
  digest,
  onRetry,
  standalone = false,
  title = copy.systemPages.error.title,
  description = copy.systemPages.error.description,
}: ErrorViewProps) {
  return (
    <SystemPage
      standalone={standalone}
      code={copy.systemPages.error.code}
      title={title}
      description={description}
      reference={
        digest ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-medium text-fg-muted">
                {copy.systemPages.error.reference}
              </span>
              <span className="truncate font-mono text-sm text-fg">{digest}</span>
            </div>
            <CopyButton value={digest} />
          </div>
        ) : null
      }
      actions={
        <>
          <Button variant="primary" size="md" onClick={onRetry}>
            <RefreshCw />
            {copy.systemPages.error.retry}
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href={ROUTES.home}>
              <House />
              {copy.actions.goHome}
            </Link>
          </Button>
        </>
      }
    />
  )
}
