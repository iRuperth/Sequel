"use client"

import { type ProgressSummary, SKILL_MODEL } from "@sequel/contracts"
import { copy, difficultyLabels, interpolate, pluralize } from "@sequel/copy"
import {
  CircleCheck,
  Flame,
  Gauge,
  ListChecks,
  SquareTerminal,
  Target,
  Timer,
  Trophy,
} from "lucide-react"
import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { Stat } from "@/components/ui/stat"
import { formatDuration, formatInteger, formatNumber, formatPercent } from "@/lib/format"
import { useProgressSummary } from "../api"
import { difficultyBandForLevel } from "../model/skills"
import { ActivityCard } from "./activity-heatmap"
import { RecommendationCard } from "./recommendation-card"
import { SkillsSection } from "./skills-table"

const kpiCopy = copy.progress.kpis

function ValueWithUnit({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      {value}
      <span className="font-sans text-sm font-normal tracking-normal text-fg-muted">{unit}</span>
    </span>
  )
}

function days(count: number): ReactNode {
  return (
    <ValueWithUnit
      value={formatInteger(count)}
      unit={pluralize(count, kpiCopy.dayUnit, kpiCopy.dayUnitPlural)}
    />
  )
}

type KpiTile = {
  key: string
  label: string
  icon: ReactNode
  value: (summary: ProgressSummary) => ReactNode
  hint?: (summary: ProgressSummary) => ReactNode
}

const KPI_TILES: readonly KpiTile[] = [
  {
    key: "solved",
    label: kpiCopy.tasksSolved,
    icon: <CircleCheck />,
    value: (summary) => formatInteger(summary.tasksSolved),
    hint: (summary) =>
      interpolate(kpiCopy.tasksOpenHint, { count: formatInteger(summary.tasksOpen) }),
  },
  {
    key: "attempted",
    label: kpiCopy.tasksAttempted,
    icon: <ListChecks />,
    value: (summary) => formatInteger(summary.tasksAttempted),
    hint: (summary) =>
      interpolate(
        pluralize(summary.submissionsTotal, kpiCopy.submissionsHint, kpiCopy.submissionsHintPlural),
        { count: formatInteger(summary.submissionsTotal) },
      ),
  },
  {
    key: "passRate",
    label: kpiCopy.passRate,
    icon: <Target />,
    value: (summary) => formatPercent(summary.passRate),
  },
  {
    key: "currentStreak",
    label: kpiCopy.currentStreak,
    icon: <Flame />,
    value: (summary) => days(summary.currentStreak),
  },
  {
    key: "longestStreak",
    label: kpiCopy.longestStreak,
    icon: <Trophy />,
    value: (summary) => days(summary.longestStreak),
  },
  {
    key: "queries",
    label: kpiCopy.totalQueries,
    icon: <SquareTerminal />,
    value: (summary) => formatInteger(summary.queriesTotal),
    hint: (summary) =>
      interpolate(kpiCopy.queriesTodayHint, { count: formatInteger(summary.queriesToday) }),
  },
  {
    key: "duration",
    label: kpiCopy.averageDuration,
    icon: <Timer />,
    value: (summary) => formatDuration(summary.averageDurationMs),
    hint: () => kpiCopy.averageDurationHint,
  },
  {
    key: "level",
    label: kpiCopy.overallLevel,
    icon: <Gauge />,
    value: (summary) => (
      <ValueWithUnit
        value={formatNumber(summary.overallLevel, "integer")}
        unit={interpolate(kpiCopy.levelOutOf, { max: SKILL_MODEL.maxLevel })}
      />
    ),
    hint: (summary) =>
      interpolate(kpiCopy.overallLevelHint, {
        band: difficultyLabels[difficultyBandForLevel(summary.overallLevel)],
      }),
  },
]

function KpiGrid({ summary, pending }: { summary: ProgressSummary | undefined; pending: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {KPI_TILES.map((tile) => (
        <Stat
          key={tile.key}
          label={tile.label}
          icon={tile.icon}
          loading={pending}
          value={summary ? tile.value(summary) : null}
          hint={summary && tile.hint ? tile.hint(summary) : undefined}
        />
      ))}
    </div>
  )
}

export function ProgressView() {
  const summaryQuery = useProgressSummary()
  const summary = summaryQuery.data
  const retrySummary = () => void summaryQuery.refetch()
  return (
    <PageContainer>
      <PageHeader title={copy.progress.title} description={copy.progress.description} />
      <div className="flex flex-col gap-5">
        {summaryQuery.isError && !summary ? (
          <Card>
            <ErrorState
              compact
              error={summaryQuery.error}
              onRetry={retrySummary}
              retrying={summaryQuery.isFetching}
            />
          </Card>
        ) : (
          <KpiGrid summary={summary} pending={summaryQuery.isPending} />
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          <ActivityCard className="lg:col-span-2" />
          <RecommendationCard
            className="flex flex-col"
            summary={summary}
            pending={summaryQuery.isPending}
            error={summaryQuery.error}
            retrying={summaryQuery.isFetching}
            onRetry={retrySummary}
          />
        </div>
        <SkillsSection track={summary?.recommendedTrack ?? null} />
      </div>
    </PageContainer>
  )
}
