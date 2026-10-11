"use client"

import type { TaskSummary } from "@sequel/contracts"
import { copy, difficultyLabels, interpolate, taskStatusLabels, trackLabels } from "@sequel/copy"
import { ArrowRight, ListTodo, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { SkeletonRows } from "@/components/ui/skeleton"
import { UI_LIMITS } from "@/config/constants"
import { ROUTES, routeTo } from "@/config/routes"
import { formatInteger } from "@/lib/format"
import { difficultyTone, taskStatusTone } from "@/lib/tones"
import { useOpenTasks } from "../api"

const SKELETON_ROWS = 4
const openTasksCopy = copy.home.openTasks

function OpenTaskRow({ task }: { task: TaskSummary }) {
  return (
    <li>
      <Link
        href={routeTo.task(task.id)}
        className="flex h-11 items-center gap-3 px-4 transition-colors hover:bg-surface-2/60"
      >
        <span className="w-20 shrink-0 truncate font-mono text-xs text-fg-muted">
          {task.ticketKey}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{task.title}</span>
        <span className="hidden w-28 shrink-0 truncate text-xs text-fg-muted md:inline">
          {trackLabels[task.track]}
        </span>
        <span className="hidden w-24 shrink-0 sm:flex">
          <Badge tone={taskStatusTone[task.status]} dot>
            {taskStatusLabels[task.status]}
          </Badge>
        </span>
        <span className="flex w-24 shrink-0 justify-end">
          <Badge tone={difficultyTone[task.difficulty]}>{difficultyLabels[task.difficulty]}</Badge>
        </span>
      </Link>
    </li>
  )
}

export function OpenTasksCard() {
  const query = useOpenTasks(UI_LIMITS.homeOpenTasks)
  const total = query.data?.total ?? 0
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<ListTodo />}
        title={openTasksCopy.title}
        description={
          query.data
            ? interpolate(openTasksCopy.count, { count: formatInteger(total) })
            : openTasksCopy.description
        }
        actions={
          <Button variant="ghost" size="xs" asChild>
            <Link href={ROUTES.tasks}>
              {copy.actions.viewAll}
              <ArrowRight />
            </Link>
          </Button>
        }
      />
      {query.isPending ? (
        <SkeletonRows rows={SKELETON_ROWS} className="p-4" />
      ) : query.isError ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          compact
          icon={ListTodo}
          title={openTasksCopy.emptyTitle}
          description={openTasksCopy.emptyDescription}
          action={
            <Button variant="primary" asChild>
              <Link href={routeTo.newTask()}>
                <Plus />
                {copy.actions.newTask}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {query.data.items.map((task) => (
            <OpenTaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </Card>
  )
}
