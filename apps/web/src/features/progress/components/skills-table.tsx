"use client"

import { SKILL_MODEL, type TopicSkill, type Track } from "@sequel/contracts"
import { copy, difficultyLabels, interpolate, topicLabels, trackLabels } from "@sequel/copy"
import { GraduationCap, Lock } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Meter } from "@/components/ui/meter"
import { SectionHeader } from "@/components/ui/page-header"
import { RelativeTime } from "@/components/ui/relative-time"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SkeletonTable } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { formatInteger, formatNumber, formatPercent } from "@/lib/format"
import { difficultyTone } from "@/lib/tones"
import { useSkills } from "../api"
import {
  difficultyBandForLevel,
  isFocusTopic,
  missingPrerequisites,
  skillPassRate,
  topicList,
} from "../model/skills"

type SkillFilter = "all" | "focus"

const skillsCopy = copy.progress.skills
const SKELETON_ROWS = 8
const SKELETON_COLUMNS = 7

const FILTER_OPTIONS: readonly { value: SkillFilter; label: string }[] = [
  { value: "all", label: skillsCopy.filters.all },
  { value: "focus", label: skillsCopy.filters.focus },
]

function TopicCell({
  skill,
  skills,
  track,
}: {
  skill: TopicSkill
  skills: readonly TopicSkill[]
  track: Track | null
}) {
  const label = topicLabels[skill.topic]
  const focus = isFocusTopic(skill.topic, track)
  const missing = skill.unlocked ? [] : missingPrerequisites(skill.topic, skills)
  return (
    <div className="flex min-w-0 items-center gap-2">
      {skill.unlocked ? null : (
        <Lock aria-label={skillsCopy.locked} className="size-3.5 shrink-0 text-fg-subtle" />
      )}
      <span className={cn("truncate font-medium", skill.unlocked ? "text-fg" : "text-fg-muted")}>
        {label}
      </span>
      {focus && track ? (
        <Tooltip content={interpolate(skillsCopy.focusDetail, { track: trackLabels[track] })}>
          <span className="inline-flex">
            <Badge tone="accent">{skillsCopy.focus}</Badge>
          </span>
        </Tooltip>
      ) : null}
      {missing.length > 0 ? (
        <Tooltip
          content={interpolate(skillsCopy.requiresDetail, {
            threshold: SKILL_MODEL.prerequisiteThreshold,
            topics: topicList(missing),
          })}
        >
          <span className="truncate text-xs text-fg-subtle">
            {interpolate(skillsCopy.requires, { topics: topicList(missing) })}
          </span>
        </Tooltip>
      ) : null}
    </div>
  )
}

function SkillRow({
  skill,
  skills,
  track,
}: {
  skill: TopicSkill
  skills: readonly TopicSkill[]
  track: Track | null
}) {
  const band = difficultyBandForLevel(skill.level)
  const level = formatNumber(skill.level, "integer")
  const numberClass = cn(
    "text-right font-mono tabular",
    skill.unlocked ? "text-fg" : "text-fg-subtle",
  )
  return (
    <TableRow className={cn(!skill.unlocked && "bg-surface-2/30")}>
      <TableCell className="max-w-0 min-w-64">
        <TopicCell skill={skill} skills={skills} track={track} />
      </TableCell>
      <TableCell className="w-60">
        <div className="flex items-center gap-2.5">
          <Meter
            value={skill.level}
            max={SKILL_MODEL.maxLevel}
            tone={skill.unlocked ? "accent" : "neutral"}
            label={interpolate(skillsCopy.levelLabel, { topic: topicLabels[skill.topic], level })}
            className="w-36"
          />
          <span className={cn("w-7 text-xs", numberClass)}>{level}</span>
        </div>
      </TableCell>
      <TableCell className="w-32">
        <Badge tone={skill.unlocked ? difficultyTone[band] : "neutral"}>
          {difficultyLabels[band]}
        </Badge>
      </TableCell>
      <TableCell className={cn("w-24", numberClass)}>{formatInteger(skill.attempts)}</TableCell>
      <TableCell className={cn("w-24", numberClass)}>{formatInteger(skill.passes)}</TableCell>
      <TableCell className={cn("w-24", numberClass)}>
        {formatPercent(skillPassRate(skill))}
      </TableCell>
      <TableCell className="w-36 text-right text-fg-muted">
        <RelativeTime value={skill.lastPracticedAt} />
      </TableCell>
    </TableRow>
  )
}

export function SkillsSection({ track }: { track: Track | null }) {
  const query = useSkills()
  const [filter, setFilter] = useState<SkillFilter>("all")
  const skills = query.data ?? []
  const visible =
    filter === "focus" && track
      ? skills.filter((skill) => isFocusTopic(skill.topic, track))
      : skills
  const focusEmpty = filter === "focus" && visible.length === 0
  return (
    <section className="flex flex-col">
      <SectionHeader
        title={skillsCopy.title}
        description={interpolate(skillsCopy.description, {
          max: SKILL_MODEL.maxLevel,
          threshold: SKILL_MODEL.prerequisiteThreshold,
        })}
        actions={
          track ? (
            <SegmentedControl
              value={filter}
              onValueChange={setFilter}
              options={FILTER_OPTIONS}
              ariaLabel={skillsCopy.filterLabel}
              size="xs"
            />
          ) : null
        }
      />
      {query.isPending ? (
        <SkeletonTable rows={SKELETON_ROWS} columns={SKELETON_COLUMNS} />
      ) : query.isError ? (
        <Card>
          <ErrorState
            compact
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={GraduationCap}
            title={focusEmpty ? skillsCopy.emptyFocusTitle : skillsCopy.emptyTitle}
            description={
              focusEmpty ? skillsCopy.emptyFocusDescription : skillsCopy.emptyDescription
            }
          />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{skillsCopy.columns.topic}</TableHead>
                <TableHead>{skillsCopy.columns.level}</TableHead>
                <TableHead>{skillsCopy.columns.band}</TableHead>
                <TableHead className="text-right">{skillsCopy.columns.attempts}</TableHead>
                <TableHead className="text-right">{skillsCopy.columns.passes}</TableHead>
                <TableHead className="text-right">{skillsCopy.columns.passRate}</TableHead>
                <TableHead className="text-right">{skillsCopy.columns.lastPracticed}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((skill) => (
                <SkillRow key={skill.topic} skill={skill} skills={skills} track={track} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  )
}
