import { copy } from "@sequel/copy"
import Link from "next/link"
import type { ReactNode } from "react"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/cn"

type SystemPageProps = {
  code: string
  title: string
  description: string
  actions: ReactNode
  reference?: ReactNode
  standalone?: boolean
}

export function SystemPage({
  code,
  title,
  description,
  actions,
  reference,
  standalone = false,
}: SystemPageProps) {
  return (
    <div
      className={cn("flex w-full flex-col bg-background", standalone ? "min-h-dvh" : "min-h-full")}
    >
      {standalone ? (
        <div className="flex h-11 items-center border-b border-border bg-surface px-5">
          <Link href={ROUTES.home} className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
            {copy.app.name}
          </Link>
        </div>
      ) : null}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-lg flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-sm font-medium tracking-wider text-accent-2">
              {code}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            <p className="text-base text-fg-muted">{description}</p>
          </div>
          {reference ? (
            <div className="rounded-md border border-border bg-surface px-4 py-3">{reference}</div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
          <p className="border-t border-border pt-4 text-sm text-fg-subtle">
            {copy.systemPages.support}{" "}
            <Link href={ROUTES.status} className="text-accent-2 hover:underline">
              {copy.nav.status}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
