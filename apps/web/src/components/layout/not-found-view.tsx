"use client"

import { copy } from "@sequel/copy"
import { ArrowLeft, House } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { SystemPage } from "./system-page"

export function NotFoundView() {
  const pathname = usePathname()
  const router = useRouter()
  return (
    <SystemPage
      standalone
      code={copy.systemPages.notFound.code}
      title={copy.systemPages.notFound.title}
      description={copy.systemPages.notFound.description}
      reference={
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-medium text-fg-muted">
            {copy.systemPages.notFound.requestedPath}
          </span>
          <span className="truncate font-mono text-sm text-fg">{pathname}</span>
        </div>
      }
      actions={
        <>
          <Button variant="primary" size="md" asChild>
            <Link href={ROUTES.home}>
              <House />
              {copy.actions.goHome}
            </Link>
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.back()}>
            <ArrowLeft />
            {copy.actions.back}
          </Button>
        </>
      }
    />
  )
}
