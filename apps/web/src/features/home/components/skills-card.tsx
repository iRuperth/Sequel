"use client"

import { SKILL_MODEL } from "@sequel/contracts"
import { copy, interpolate, topicLabels } from "@sequel/copy"
import { ArrowRight, GraduationCap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Meter } from "@/components/ui/meter"
import { Skeleton } from "@/components/ui/skeleton"
import { UI_LIMITS } from "@/config/constants"
import { ROUTES } from "@/config/routes"
import { useSkills } from "@/features/progress/api"
import { strongestUnlocked } from "@/features/progress/model/skills"
import { formatNumber } from "@/lib/format"

const skillsCopy = copy.home.skills

function SkillsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      {Array.from({ length: UI_LIMITS.homeSkillBars }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  )
}

export function SkillsCard() {
  const query = useSkills()
  const top = query.data ? strongestUnlocked(query.data, UI_LIMITS.homeSkillBars) : []
  return (
    <Card>
      <CardHeader
        icon={<GraduationCap />}
        title={skillsCopy.title}
        description={skillsCopy.description}
        actions={
          <Button variant="ghost" size="xs" asChild>
            <Link href={ROUTES.progress}>
              {skillsCopy.viewProgress}
              <ArrowRight />
            </Link>
          </Button>
        }
      />
      {query.isPending ? (
        <CardBody>
          <SkillsSkeleton />
        </CardBody>
      ) : query.isError ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : top.length === 0 ? (
        <EmptyState
          compact
          icon={GraduationCap}
          title={skillsCopy.emptyTitle}
          description={skillsCopy.emptyDescription}
        />
      ) : (
        <CardBody>
          <ul className="flex flex-col gap-3">
            {top.map((skill) => {
              const label = topicLabels[skill.topic]
              const level = formatNumber(skill.level, "integer")
              return (
                <li key={skill.topic} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-fg">{label}</span>
                    <span className="font-mono text-xs tabular text-fg-muted">{level}</span>
                  </div>
                  <Meter
                    value={skill.level}
                    max={SKILL_MODEL.maxLevel}
                    label={interpolate(skillsCopy.levelLabel, { topic: label, level })}
                  />
                </li>
              )
            })}
          </ul>
        </CardBody>
      )}
    </Card>
  )
}
