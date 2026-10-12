"use client"

import { type ProgressSummary, TRACK_FOCUS } from "@sequel/contracts"
import {
  copy,
  difficultyLabels,
  difficultySeniority,
  interpolate,
  topicLabels,
  trackDescriptions,
  trackLabels,
} from "@sequel/copy"
import { Compass, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { routeTo } from "@/config/routes"
import { difficultyTone } from "@/lib/tones"

const recommendationCopy = copy.progress.recommendation

type RecommendationCardProps = {
  summary: ProgressSummary | undefined
  pending: boolean
  error: unknown
  retrying: boolean
  onRetry: () => void
  className?: string
}

function RecommendationSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

function RecommendationBody({ summary }: { summary: ProgressSummary }) {
  const difficulty = summary.recommendedDifficulty
  const track = summary.recommendedTrack
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">{recommendationCopy.difficulty}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={difficultyTone[difficulty]} dot>
            {difficultyLabels[difficulty]}
          </Badge>
          <span className="text-sm text-fg-muted">
            {interpolate(recommendationCopy.seniority, {
              seniority: difficultySeniority[difficulty],
            })}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">{recommendationCopy.track}</span>
        <span className="text-md font-medium text-fg">{trackLabels[track]}</span>
        <p className="text-sm text-fg-muted">{trackDescriptions[track]}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-fg-muted">{recommendationCopy.focusTopics}</span>
        <div className="flex flex-wrap gap-1">
          {TRACK_FOCUS[track].map((topic) => (
            <Badge key={topic} variant="outline">
              {topicLabels[topic]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RecommendationCard({
  summary,
  pending,
  error,
  retrying,
  onRetry,
  className,
}: RecommendationCardProps) {
  return (
    <Card className={className}>
      <CardHeader
        icon={<Compass />}
        title={recommendationCopy.title}
        description={recommendationCopy.description}
      />
      <CardBody className="flex-1">
        {pending ? (
          <RecommendationSkeleton />
        ) : summary ? (
          <RecommendationBody summary={summary} />
        ) : (
          <ErrorState compact error={error} onRetry={onRetry} retrying={retrying} />
        )}
      </CardBody>
      <CardFooter>
        <Button variant="primary" size="sm" className="w-full" asChild>
          <Link href={routeTo.newTask()}>
            <Plus />
            {recommendationCopy.start}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
