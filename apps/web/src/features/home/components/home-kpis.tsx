"use client"

import { copy, interpolate, pluralize } from "@sequel/copy"
import { CircleCheck, Flame, SquareTerminal, Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Stat } from "@/components/ui/stat"
import { useProgressSummary } from "@/features/progress/api"
import { formatInteger, formatPercent } from "@/lib/format"

const kpiCopy = copy.home.kpis

export function HomeKpis() {
  const query = useProgressSummary()
  const summary = query.data
  if (query.isError && !summary) {
    return (
      <Card>
        <ErrorState
          compact
          title={kpiCopy.unavailable}
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </Card>
    )
  }
  const loading = query.isPending
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label={kpiCopy.queriesToday}
        icon={<SquareTerminal />}
        loading={loading}
        value={formatInteger(summary?.queriesToday)}
        hint={
          summary
            ? interpolate(kpiCopy.queriesTotalHint, { count: formatInteger(summary.queriesTotal) })
            : undefined
        }
      />
      <Stat
        label={kpiCopy.tasksSolved}
        icon={<CircleCheck />}
        loading={loading}
        value={formatInteger(summary?.tasksSolved)}
        hint={
          summary
            ? interpolate(kpiCopy.tasksSolvedHint, { count: formatInteger(summary.tasksOpen) })
            : undefined
        }
      />
      <Stat
        label={kpiCopy.currentStreak}
        icon={<Flame />}
        loading={loading}
        value={
          <span className="inline-flex items-baseline gap-1.5">
            {formatInteger(summary?.currentStreak)}
            {summary ? (
              <span className="font-sans text-sm font-normal tracking-normal text-fg-muted">
                {pluralize(summary.currentStreak, kpiCopy.streakUnit, kpiCopy.streakUnitPlural)}
              </span>
            ) : null}
          </span>
        }
        hint={
          summary
            ? interpolate(kpiCopy.longestStreakHint, {
                count: formatInteger(summary.longestStreak),
                unit: pluralize(
                  summary.longestStreak,
                  kpiCopy.streakUnit,
                  kpiCopy.streakUnitPlural,
                ),
              })
            : undefined
        }
      />
      <Stat
        label={kpiCopy.passRate}
        icon={<Target />}
        loading={loading}
        value={formatPercent(summary?.passRate)}
        hint={
          summary
            ? interpolate(
                pluralize(
                  summary.submissionsTotal,
                  kpiCopy.passRateHint,
                  kpiCopy.passRateHintPlural,
                ),
                { count: formatInteger(summary.submissionsTotal) },
              )
            : undefined
        }
      />
    </div>
  )
}
