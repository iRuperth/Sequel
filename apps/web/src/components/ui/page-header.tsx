import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow ? <div className="text-xs font-medium text-fg-muted">{eyebrow}</div> : null}
          <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
          {description ? <p className="max-w-3xl text-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          {meta}
        </div>
      ) : null}
    </header>
  )
}

export function PageContainer({
  className,
  width = "default",
  ...props
}: ComponentProps<"div"> & { width?: "default" | "narrow" | "wide" | "full" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 pt-5 pb-10",
        width === "default" && "max-w-[1360px]",
        width === "narrow" && "max-w-[960px]",
        width === "wide" && "max-w-[1680px]",
        className,
      )}
      {...props}
    />
  )
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pb-2.5", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-md font-semibold text-fg">{title}</h2>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
