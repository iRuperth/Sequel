"use client"

import type { JobSnapshot, ScheduledQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { CalendarClock, EllipsisVertical, FileClock, Pencil, Play, Plus, Trash } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SkeletonTable } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import {
  useDeleteScheduledQuery,
  useRunScheduledQuery,
  useScheduledQueries,
  useToggleScheduledQuery,
} from "../../api-scheduled"
import { JOBS_SKELETON_COLUMNS, JOBS_SKELETON_ROWS } from "../../model/constants"
import { cronPresetLabel } from "../../model/cron-presets"
import { useJob } from "../../model/use-job"
import { RunStatusBadge, ToneBadge } from "../status-badges"
import { ScheduleFormDialog } from "./schedule-form-dialog"
import { ScheduleRunsSheet } from "./schedule-runs-sheet"

const t = copy.jobs.scheduled

type PanelProps = {
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}

type TargetState = { open: boolean; schedule: ScheduledQuery | null }

const CLOSED: TargetState = { open: false, schedule: null }

export function ScheduledQueriesPanel({ createOpen, onCreateOpenChange }: PanelProps) {
  const schedules = useScheduledQueries()
  const remove = useDeleteScheduledQuery()
  const [editTarget, setEditTarget] = useState<TargetState>(CLOSED)
  const [runsTarget, setRunsTarget] = useState<TargetState>(CLOSED)
  const [deleteTarget, setDeleteTarget] = useState<ScheduledQuery | null>(null)
  const items = schedules.data?.items ?? []

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t.deleted)
        setDeleteTarget(null)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  return (
    <>
      {schedules.isPending ? (
        <SkeletonTable rows={JOBS_SKELETON_ROWS} columns={JOBS_SKELETON_COLUMNS.schedules} />
      ) : schedules.isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            error={schedules.error}
            onRetry={() => void schedules.refetch()}
            retrying={schedules.isRefetching}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface">
          <EmptyState
            icon={CalendarClock}
            title={t.empty.title}
            description={t.empty.description}
            action={
              <Button variant="primary" onClick={() => onCreateOpenChange(true)}>
                <Plus />
                {t.newSchedule}
              </Button>
            }
          />
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead>{t.columns.savedQuery}</TableHead>
                <TableHead>{t.columns.schedule}</TableHead>
                <TableHead>{t.columns.timezone}</TableHead>
                <TableHead>{t.columns.enabled}</TableHead>
                <TableHead>{t.columns.lastRun}</TableHead>
                <TableHead>{t.columns.nextRun}</TableHead>
                <TableHead className="w-0 text-right">
                  <span className="sr-only">{t.columns.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={() => setEditTarget({ open: true, schedule })}
                  onViewRuns={() => setRunsTarget({ open: true, schedule })}
                  onDelete={() => setDeleteTarget(schedule)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ScheduleFormDialog open={createOpen} onOpenChange={onCreateOpenChange} schedule={null} />
      <ScheduleFormDialog
        open={editTarget.open}
        onOpenChange={(open) => setEditTarget((current) => ({ ...current, open }))}
        schedule={editTarget.schedule}
      />
      <ScheduleRunsSheet
        open={runsTarget.open}
        onOpenChange={(open) => setRunsTarget((current) => ({ ...current, open }))}
        schedule={runsTarget.schedule}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title={interpolate(t.deleteTitle, { name: deleteTarget?.name ?? "" })}
        description={t.deleteDescription}
        confirmLabel={copy.actions.delete}
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}

type ScheduleRowProps = {
  schedule: ScheduledQuery
  onEdit: () => void
  onViewRuns: () => void
  onDelete: () => void
}

function ScheduleRow({ schedule, onEdit, onViewRuns, onDelete }: ScheduleRowProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const run = useRunScheduledQuery()
  const toggle = useToggleScheduledQuery()
  const job = useJob(jobId, {
    onSettled: (snapshot: JobSnapshot) => {
      if (snapshot.status === "succeeded") {
        toast.success(t.runSucceeded, schedule.name)
      } else {
        toast.error(t.runFailed, snapshot.error ?? schedule.name)
      }
      setJobId(null)
    },
  })
  const running = run.isPending || job.isRunning
  const presetLabel = cronPresetLabel(schedule.cronExpression)

  const runNow = () =>
    run.mutate(schedule.id, {
      onSuccess: ({ jobId: triggered }) => {
        toast.info(t.runQueued, interpolate(t.runQueuedDescription, { name: schedule.name }))
        setJobId(triggered)
      },
      onError: (error) => toast.fromError(error),
    })

  const setEnabled = (isEnabled: boolean) =>
    toggle.mutate(
      { schedule, isEnabled },
      {
        onSuccess: () => toast.success(isEnabled ? t.enabledToast : t.pausedToast),
        onError: (error) => toast.fromError(error),
      },
    )

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <span className="block truncate font-medium" title={schedule.name}>
          {schedule.name}
        </span>
      </TableCell>
      <TableCell className="max-w-56">
        <span className="block truncate text-fg-muted" title={schedule.savedQueryName}>
          {schedule.savedQueryName}
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg">
            {schedule.cronExpression}
          </code>
          {presetLabel ? <span className="text-xs text-fg-muted">{presetLabel}</span> : null}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs whitespace-nowrap text-fg-muted">
        {schedule.timezone}
      </TableCell>
      <TableCell>
        <Switch
          checked={schedule.isEnabled}
          onCheckedChange={setEnabled}
          aria-label={interpolate(t.toggleLabel, { name: schedule.name })}
        />
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {running ? (
            <ToneBadge tone="info" label={t.running} pulse />
          ) : schedule.lastStatus ? (
            <RunStatusBadge status={schedule.lastStatus} />
          ) : (
            <span className="text-xs text-fg-subtle">{t.notRun}</span>
          )}
          {schedule.lastRunAt ? (
            <RelativeTime value={schedule.lastRunAt} className="text-xs text-fg-muted" />
          ) : null}
        </span>
      </TableCell>
      <TableCell className="text-xs text-fg-muted">
        {schedule.isEnabled ? (
          <RelativeTime value={schedule.nextRunAt} />
        ) : (
          <span className="text-fg-subtle">{t.paused}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-0.5">
          <Tooltip content={t.runNow}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t.runNow}
              onClick={runNow}
              loading={running}
            >
              {running ? null : <Play />}
            </Button>
          </Tooltip>
          <DropdownMenu>
            <Tooltip content={t.rowActions}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={t.rowActions}>
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={runNow} disabled={running}>
                <Play />
                {t.runNow}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                {copy.actions.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onViewRuns}>
                <FileClock />
                {t.viewRuns}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onDelete}>
                <Trash />
                {copy.actions.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
