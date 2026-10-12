"use client"

import {
  copy,
  difficultyLabels,
  difficultySeniority,
  interpolate,
  trackDescriptions,
  trackLabels,
} from "@sequel/copy"
import { Compass, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { routeTo } from "@/config/routes"
import { useProgressSummary } from "@/features/progress/api"
import { formatNumber } from "@/lib/format"
import { difficultyTone } from "@/lib/tones"

const recommendedCopy = copy.home.recommended

function RecommendedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-7 w-full" />
    </div>
  )
}

export function RecommendedCard() {
  const query = useProgressSummary()
  const summary = query.data
  return (
    <Card>
      <CardHeader
        icon={<Compass />}
        title={recommendedCopy.title}
        description={recommendedCopy.description}
      />
      {query.isPending ? (
        <CardBody>
          <RecommendedSkeleton />
        </CardBody>
      ) : !summary ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-fg-muted">{recommendedCopy.difficulty}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={difficultyTone[summary.recommendedDifficulty]} dot>
                {difficultyLabels[summary.recommendedDifficulty]}
              </Badge>
              <span className="text-sm text-fg-muted">
                {interpolate(recommendedCopy.seniority, {
                  seniority: difficultySeniority[summary.recommendedDifficulty],
                })}
              </span>
            </div>
            <span className="text-xs text-fg-subtle">
              {interpolate(recommendedCopy.levelHint, {
                level: formatNumber(summary.overallLevel, "integer"),
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-fg-muted">{recommendedCopy.track}</span>
            <span className="text-sm font-medium text-fg">
              {trackLabels[summary.recommendedTrack]}
            </span>
            <p className="text-xs text-fg-muted">{trackDescriptions[summary.recommendedTrack]}</p>
          </div>
          <Button variant="primary" className="w-full" asChild>
            <Link href={routeTo.newTask()}>
              <Plus />
              {recommendedCopy.startTask}
            </Link>
          </Button>
        </CardBody>
      )}
    </Card>
  )
}
