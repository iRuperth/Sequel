"use client"

import type { DashboardSummary } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { LayoutDashboard, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { RelativeTime } from "@/components/ui/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { routeTo } from "@/config/routes"
import { cn } from "@/lib/cn"

export function widgetCountLabel(count: number): string {
  return count === 1
    ? copy.dashboards.list.widgetCountOne
    : interpolate(copy.dashboards.list.widgetCount, { count })
}

export function DashboardCard({ dashboard }: { dashboard: DashboardSummary }) {
  return (
    <Link
      href={routeTo.dashboard(dashboard.id)}
      aria-label={interpolate(copy.dashboards.list.open, { name: dashboard.name })}
      className="group flex min-h-36 flex-col justify-between gap-4 rounded-md border border-border bg-surface p-4 transition-colors outline-none hover:border-border-strong hover:bg-surface-2/40 focus-visible:border-accent-2"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-2">
          <LayoutDashboard className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-base font-medium text-fg group-hover:text-accent-2">
            {dashboard.name}
          </h3>
          <p
            className={cn(
              "line-clamp-2 text-sm",
              dashboard.description ? "text-fg-muted" : "text-fg-subtle",
            )}
          >
            {dashboard.description || copy.dashboards.list.noDescription}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <LayoutGrid className="size-3.5 text-fg-subtle" />
          <span className="tabular">{widgetCountLabel(dashboard.widgetCount)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-fg-subtle">
          {copy.dashboards.list.updated}
          <RelativeTime value={dashboard.updatedAt} className="text-fg-muted" />
        </span>
      </div>
    </Link>
  )
}

export function DashboardCardSkeleton() {
  return (
    <div className="flex min-h-36 flex-col justify-between gap-4 rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
