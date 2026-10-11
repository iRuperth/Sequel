"use client"

import type { PlatformStatus } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import {
  CircleCheck,
  CircleX,
  type LucideIcon,
  RefreshCw,
  TriangleAlert,
  Unplug,
} from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { publicConfig } from "@/config/public"
import { describeError } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { formatDate, formatUptime } from "@/lib/format"
import { toneTextClass } from "@/lib/tones"
import { type OverallState, overallState } from "../model/overall"
import {
  OVERALL_BANNER_CLASS,
  OVERALL_LABEL,
  OVERALL_TONE,
  healthyServiceCount,
} from "../model/presentation"

const OVERALL_ICON: Record<OverallState, LucideIcon> = {
  operational: CircleCheck,
  degraded: TriangleAlert,
  down: CircleX,
}

const metaCopy = copy.status.meta
const META_SKELETON_ITEMS = 5

type MetaItem = { key: string; label: string; value: ReactNode; mono?: boolean }

function MetaGrid({ items }: { items: readonly MetaItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.key} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-fg-muted">{item.label}</dt>
          <dd
            className={cn(
              "truncate text-sm text-fg",
              item.mono && "font-mono text-xs leading-5 tabular",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function OverallBanner({ status }: { status: PlatformStatus }) {
  const state = overallState(status.services)
  const Icon = OVERALL_ICON[state]
  return (
    <section className={cn("rounded-md border border-border", OVERALL_BANNER_CLASS[state])}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Icon className={cn("size-5 shrink-0", toneTextClass[OVERALL_TONE[state]])} />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-md font-semibold text-fg">{OVERALL_LABEL[state]}</h2>
          <p className="text-sm text-fg-muted">
            {interpolate(copy.status.summary, {
              healthy: healthyServiceCount(status.services),
              total: status.services.length,
            })}
          </p>
        </div>
      </div>
      <MetaGrid
        items={[
          {
            key: "environment",
            label: metaCopy.environment,
            value: status.environment,
            mono: true,
          },
          { key: "api", label: metaCopy.apiVersion, value: status.version, mono: true },
          { key: "web", label: metaCopy.webVersion, value: publicConfig.appVersion, mono: true },
          {
            key: "uptime",
            label: metaCopy.uptime,
            value: formatUptime(status.uptimeSeconds),
            mono: true,
          },
          {
            key: "checked",
            label: metaCopy.checkedAt,
            value: formatDate(status.checkedAt, "dateTimeSeconds"),
          },
        ]}
      />
    </section>
  )
}

export function UnreachableBanner({
  error,
  stale,
  retrying,
  onRetry,
}: {
  error: unknown
  stale: boolean
  retrying: boolean
  onRetry: () => void
}) {
  const described = describeError(error)
  return (
    <section
      role="alert"
      className={cn("rounded-md border border-border", OVERALL_BANNER_CLASS.unreachable)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <Unplug className="mt-0.5 size-5 shrink-0 text-danger" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-md font-semibold text-fg">{copy.status.unreachable.title}</h2>
            <p className="text-sm text-fg-muted">
              {stale ? copy.status.unreachable.description : copy.status.unreachable.noData}
            </p>
            <p className="text-sm text-danger">{described.message}</p>
            {described.detail ? (
              <p className="font-mono text-xs break-words text-fg-subtle">{described.detail}</p>
            ) : null}
          </div>
        </div>
        <Button onClick={onRetry} loading={retrying}>
          {retrying ? null : <RefreshCw />}
          {copy.actions.retry}
        </Button>
      </div>
      <MetaGrid
        items={[
          { key: "web", label: metaCopy.webVersion, value: publicConfig.appVersion, mono: true },
        ]}
      />
    </section>
  )
}

export function BannerSkeleton() {
  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Skeleton className="size-5 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: META_SKELETON_ITEMS }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
