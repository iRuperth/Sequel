"use client"

import type { TaskDetail } from "@sequel/contracts"
import { copy, interpolate, taskModeLabels, taskSourceLabels, trackLabels } from "@sequel/copy"
import { Ban, CircleCheck, Clock, RotateCcw, User } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RelativeTime } from "@/components/ui/relative-time"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { formatInteger } from "@/lib/format"
import { useAbandonTask } from "../api"
import { DifficultyBadge, TaskStatusBadge } from "./task-badges"

const CLOSABLE: readonly TaskDetail["status"][] = ["open", "in_progress"]

function attemptsLabel(count: number): string {
  if (count === 0) {
    return copy.tasks.detail.noAttempts
  }
  if (count === 1) {
    return copy.tasks.detail.oneAttempt
  }
  return interpolate(copy.tasks.detail.attempts, { count: formatInteger(count) })
}

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fg-subtle">
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

export function TaskHeader({ task }: { task: TaskDetail }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const abandon = useAbandonTask(task.id)
  const closable = CLOSABLE.includes(task.status)

  const onConfirm = () => {
    abandon.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success(copy.tasks.detail.closed)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-surface px-5 pt-3.5 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-xs text-fg-muted">{task.ticketKey}</span>
          <h1 className="text-xl font-semibold tracking-tight text-fg">{task.title}</h1>
        </div>
        {closable ? (
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              <Ban />
              {copy.actions.giveUp}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <TaskStatusBadge status={task.status} />
        <DifficultyBadge difficulty={task.difficulty} />
        <Badge variant="outline">{trackLabels[task.track]}</Badge>
        <Badge variant="outline">{taskModeLabels[task.mode]}</Badge>
        <Badge variant="outline">{taskSourceLabels[task.source]}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
        {task.stakeholder ? (
          <MetaItem icon={<User />}>
            {interpolate(copy.tasks.detail.requestedBy, {
              name: task.stakeholder.name,
              role: task.stakeholder.role,
              team: task.stakeholder.team,
            })}
          </MetaItem>
        ) : null}
        {task.estimatedMinutes !== null ? (
          <MetaItem icon={<Clock />}>
            {interpolate(copy.tasks.detail.estimate, {
              minutes: formatInteger(task.estimatedMinutes),
            })}
          </MetaItem>
        ) : null}
        <MetaItem icon={<RotateCcw />}>{attemptsLabel(task.attempts)}</MetaItem>
        <span className="inline-flex items-center gap-1">
          {copy.tasks.detail.created}
          <RelativeTime value={task.createdAt} />
        </span>
        {task.solvedAt ? (
          <Tooltip content={copy.tasks.detail.solved}>
            <span className="inline-flex items-center gap-1 text-success">
              <CircleCheck className="size-3.5" />
              <RelativeTime value={task.solvedAt} />
            </span>
          </Tooltip>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.tasks.detail.closeConfirmTitle}
        description={copy.tasks.detail.closeConfirmDescription}
        confirmLabel={copy.actions.giveUp}
        destructive
        loading={abandon.isPending}
        onConfirm={onConfirm}
      />
    </header>
  )
}
