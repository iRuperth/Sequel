"use client"

import { copy, interpolate } from "@sequel/copy"
import { CircleCheck, CircleDashed, CircleX, Clock, ListChecks, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { RelativeTime } from "@/components/ui/relative-time"
import { Stat } from "@/components/ui/stat"
import { EMPTY_VALUE, formatInteger, formatPercent } from "@/lib/format"
import { cn } from "@/lib/cn"
import { useQualityOverview } from "../api"

const t = copy.quality.overview

export function QualityOverview() {
  const overview = useQualityOverview()
  const data = overview.data
  const loading = overview.isPending
  const total = data?.total ?? 0
  const share = (count: number) =>
    total > 0 ? interpolate(t.shareOfTotal, { percent: formatPercent(count / total) }) : undefined
  const count = (value: number | undefined, alertClass?: string): ReactNode => {
    if (value === undefined) {
      return EMPTY_VALUE
    }
    return <span className={cn(value > 0 && alertClass)}>{formatInteger(value)}</span>
  }
  return (
    <div className="grid grid-cols-2 gap-3 pb-5 md:grid-cols-3 xl:grid-cols-6">
      <Stat label={t.total} icon={<ListChecks />} loading={loading} value={count(data?.total)} />
      <Stat
        label={t.passing}
        icon={<CircleCheck />}
        loading={loading}
        value={count(data?.passing, "text-success")}
        hint={data ? share(data.passing) : undefined}
      />
      <Stat
        label={t.failing}
        icon={<CircleX />}
        loading={loading}
        value={count(data?.failing, "text-danger")}
        hint={data ? share(data.failing) : undefined}
      />
      <Stat
        label={t.erroring}
        icon={<TriangleAlert />}
        loading={loading}
        value={count(data?.erroring, "text-warning")}
        hint={data ? share(data.erroring) : undefined}
      />
      <Stat
        label={t.neverRun}
        icon={<CircleDashed />}
        loading={loading}
        value={count(data?.neverRun)}
        hint={data ? share(data.neverRun) : undefined}
      />
      <Stat
        label={t.lastRun}
        icon={<Clock />}
        loading={loading}
        value={
          data?.lastRunAt ? (
            <RelativeTime value={data.lastRunAt} className="text-xl" />
          ) : (
            <span className="text-xl text-fg-subtle">{data ? t.noRuns : EMPTY_VALUE}</span>
          )
        }
      />
    </div>
  )
}
