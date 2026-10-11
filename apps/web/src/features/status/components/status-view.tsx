"use client"

import { SERVICE_NAMES } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { RefreshCw } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PageContainer, PageHeader, SectionHeader } from "@/components/ui/page-header"
import { SkeletonTable } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tooltip } from "@/components/ui/tooltip"
import { UI_TIMING } from "@/config/constants"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { usePlatformStatus } from "../api"
import { ServicesTable } from "./services-table"
import { BannerSkeleton, OverallBanner, UnreachableBanner } from "./status-banner"

const MS_PER_SECOND = 1_000
const SKELETON_COLUMNS = 4
const REFRESH_SECONDS = UI_TIMING.statusPageRefetchMs / MS_PER_SECOND

export function StatusView() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const query = usePlatformStatus(autoRefresh ? UI_TIMING.statusPageRefetchMs : false)
  const switchId = useId()
  const status = query.data
  const refetch = () => void query.refetch()
  const refreshing = query.isFetching && !query.isPending
  return (
    <PageContainer>
      <PageHeader
        title={copy.status.title}
        description={copy.status.description}
        actions={
          <>
            <Tooltip
              content={interpolate(copy.status.autoRefreshHint, { seconds: REFRESH_SECONDS })}
            >
              <div className="flex h-7 items-center gap-2 px-1">
                <Switch id={switchId} checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                <Label htmlFor={switchId} className="font-normal text-fg-muted">
                  {copy.status.autoRefresh}
                </Label>
              </div>
            </Tooltip>
            <Button onClick={refetch} disabled={query.isFetching}>
              <RefreshCw className={cn(refreshing && "animate-spin")} />
              {copy.actions.refresh}
            </Button>
          </>
        }
        meta={
          <span aria-live="polite">
            {query.dataUpdatedAt > 0
              ? interpolate(copy.states.lastChecked, {
                  time: formatDate(query.dataUpdatedAt, "timeSeconds"),
                })
              : copy.status.checking}
          </span>
        }
      />
      <div className="flex flex-col gap-5">
        {query.isPending ? (
          <BannerSkeleton />
        ) : query.isError ? (
          <UnreachableBanner
            error={query.error}
            stale={Boolean(status)}
            retrying={query.isFetching}
            onRetry={refetch}
          />
        ) : status ? (
          <OverallBanner status={status} />
        ) : null}
        {query.isPending || status ? (
          <section className="flex flex-col">
            <SectionHeader
              title={copy.status.services.title}
              description={copy.status.services.description}
            />
            {status ? (
              <ServicesTable services={status.services} stale={query.isError} />
            ) : (
              <SkeletonTable rows={SERVICE_NAMES.length} columns={SKELETON_COLUMNS} />
            )}
          </section>
        ) : null}
      </div>
    </PageContainer>
  )
}
