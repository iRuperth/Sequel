import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-border bg-surface", className)} {...props} />
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-10 items-center justify-between gap-3 border-b border-border px-4 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <span className="text-fg-muted [&_svg]:size-4">{icon}</span> : null}
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
          {description ? <p className="truncate text-xs text-fg-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-t border-border px-4 py-2.5",
        className,
      )}
      {...props}
    />
  )
}
