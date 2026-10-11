"use client"

import { copy, serviceNameLabels, serviceStateLabels } from "@sequel/copy"
import { Activity, ArrowRight, ServerCog } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { SkeletonRows } from "@/components/ui/skeleton"
import { StatusDot } from "@/components/ui/status-dot"
import { ROUTES } from "@/config/routes"
import { usePlatformStatus } from "@/features/status/api"
import { OVERALL_LABEL, OVERALL_TONE } from "@/features/status/model/presentation"
import { overallState } from "@/features/status/model/overall"
import { cn } from "@/lib/cn"
import { formatDuration } from "@/lib/format"
import { serviceStateTone, toneTextClass } from "@/lib/tones"

const SKELETON_ROWS = 5
const platformCopy = copy.home.platform

export function PlatformCard() {
  const query = usePlatformStatus()
  const services = query.data?.services ?? []
  const overall = query.data ? overallState(query.data.services) : null
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Activity />}
        title={platformCopy.title}
        actions={
          <Button variant="ghost" size="xs" asChild>
            <Link href={ROUTES.status}>
              {platformCopy.viewStatus}
              <ArrowRight />
            </Link>
          </Button>
        }
      />
      {query.isPending ? (
        <SkeletonRows rows={SKELETON_ROWS} rowClassName="h-6" className="p-4" />
      ) : query.isError && !query.data ? (
        <ErrorState
          compact
          title={platformCopy.unreachableTitle}
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : services.length === 0 ? (
        <EmptyState
          compact
          icon={ServerCog}
          title={platformCopy.emptyTitle}
          description={platformCopy.emptyDescription}
        />
      ) : (
        <div className="flex flex-col">
          {overall ? (
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Badge tone={OVERALL_TONE[overall]} dot>
                {OVERALL_LABEL[overall]}
              </Badge>
            </div>
          ) : null}
          <ul className="flex flex-col py-1.5">
            {services.map((service) => {
              const tone = serviceStateTone[service.state]
              return (
                <li key={service.name} className="flex h-8 items-center gap-2.5 px-4 text-sm">
                  <StatusDot tone={tone} />
                  <span className="min-w-0 flex-1 truncate text-fg">
                    {serviceNameLabels[service.name]}
                  </span>
                  <span className="font-mono text-xs tabular text-fg-subtle">
                    {formatDuration(service.latencyMs)}
                  </span>
                  <span className={cn("w-24 shrink-0 text-right text-xs", toneTextClass[tone])}>
                    {serviceStateLabels[service.state]}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}
