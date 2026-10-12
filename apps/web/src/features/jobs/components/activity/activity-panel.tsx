"use client"

import {
  JOB_KINDS,
  JOB_STATUSES,
  type JobKind,
  type JobListQuery,
  type JobSnapshot,
  type JobStatus,
} from "@sequel/contracts"
import { copy, interpolate, jobKindLabels, jobStatusLabels } from "@sequel/copy"
import { Activity, RefreshCw } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Meter } from "@/components/ui/meter"
import { RelativeTime } from "@/components/ui/relative-time"
import { SimpleSelect, type SimpleSelectOption } from "@/components/ui/select"
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
import { FilterBar, ToolbarSeparator } from "@/components/ui/toolbar"
import { Tooltip } from "@/components/ui/tooltip"
import { SELECT_ALL, UI_LIMITS, UI_TIMING } from "@/config/constants"
import { EMPTY_VALUE, formatDuration, formatInteger, formatPercent } from "@/lib/format"
import { jobStatusTone } from "@/lib/tones"
import { useJobs } from "../../api"
import { JOBS_SKELETON_COLUMNS, JOBS_SKELETON_ROWS, PERCENT_SCALE } from "../../model/constants"
import { stageLabel } from "../../model/stage"
import { durationBetween } from "../../model/time"
import { JobStatusBadge } from "../status-badges"

const t = copy.jobs.activity

type KindFilter = JobKind | typeof SELECT_ALL
type StatusFilter = JobStatus | typeof SELECT_ALL

const KIND_OPTIONS: SimpleSelectOption<KindFilter>[] = [
  { value: SELECT_ALL, label: t.allKinds },
  ...JOB_KINDS.map((kind) => ({ value: kind, label: jobKindLabels[kind] })),
]

const STATUS_OPTIONS: SimpleSelectOption<StatusFilter>[] = [
  { value: SELECT_ALL, label: t.allStatuses },
  ...JOB_STATUSES.map((status) => ({ value: status, label: jobStatusLabels[status] })),
]

export function ActivityPanel() {
  const autoRefreshId = useId()
  const [kind, setKind] = useState<KindFilter>(SELECT_ALL)
  const [status, setStatus] = useState<StatusFilter>(SELECT_ALL)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const query = useMemo<JobListQuery>(
    () => ({
      kind: kind === SELECT_ALL ? undefined : kind,
      status: status === SELECT_ALL ? undefined : status,
      limit: UI_LIMITS.jobsActivityLimit,
    }),
    [kind, status],
  )
  const jobs = useJobs(query, autoRefresh ? UI_TIMING.jobsActivityRefetchMs : false)
  const items = jobs.data?.items ?? []
  const filtered = kind !== SELECT_ALL || status !== SELECT_ALL

  return (
    <div className="flex flex-col">
      <FilterBar>
        <SimpleSelect
          value={kind}
          onValueChange={setKind}
          options={KIND_OPTIONS}
          ariaLabel={t.kind}
          className="w-48"
        />
        <SimpleSelect
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel={t.status}
          className="w-40"
        />
        {filtered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setKind(SELECT_ALL)
              setStatus(SELECT_ALL)
            }}
          >
            {copy.states.clearFilters}
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {jobs.data ? (
            <span className="text-xs text-fg-subtle tabular">
              {interpolate(t.showing, { count: items.length })}
            </span>
          ) : null}
          <ToolbarSeparator />
          <label
            htmlFor={autoRefreshId}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg-muted select-none"
          >
            <Switch id={autoRefreshId} checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            {t.autoRefresh}
          </label>
          <Tooltip content={copy.actions.refresh}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={copy.actions.refresh}
              onClick={() => void jobs.refetch()}
              disabled={jobs.isFetching}
            >
              <RefreshCw className={jobs.isFetching ? "animate-spin" : undefined} />
            </Button>
          </Tooltip>
        </div>
      </FilterBar>

      {jobs.isPending ? (
        <SkeletonTable rows={JOBS_SKELETON_ROWS} columns={JOBS_SKELETON_COLUMNS.activity} />
      ) : jobs.isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            error={jobs.error}
            onRetry={() => void jobs.refetch()}
            retrying={jobs.isRefetching}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface">
          <EmptyState
            icon={Activity}
            title={filtered ? copy.states.noResults : t.empty.title}
            description={filtered ? undefined : t.empty.description}
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setKind(SELECT_ALL)
                    setStatus(SELECT_ALL)
                  }}
                >
                  {copy.states.clearFilters}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.kind}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.progress}</TableHead>
                <TableHead>{t.columns.subject}</TableHead>
                <TableHead className="text-right">{t.columns.attempts}</TableHead>
                <TableHead>{t.columns.created}</TableHead>
                <TableHead className="text-right">{t.columns.duration}</TableHead>
                <TableHead>{t.columns.error}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

function JobRow({ job }: { job: JobSnapshot }) {
  const duration = durationBetween(job.startedAt, job.finishedAt)
  const stage = stageLabel(job.stage)
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{jobKindLabels[job.kind]}</TableCell>
      <TableCell>
        <JobStatusBadge status={job.status} />
      </TableCell>
      <TableCell className="min-w-44">
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <Meter
              value={job.progress}
              max={PERCENT_SCALE}
              tone={jobStatusTone[job.status]}
              className="w-24"
              label={t.columns.progress}
            />
            <span className="font-mono text-2xs text-fg-muted tabular">
              {formatPercent(job.progress / PERCENT_SCALE, true)}
            </span>
          </div>
          {stage ? (
            <span className="max-w-56 truncate text-2xs text-fg-subtle" title={stage}>
              {stage}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="max-w-40">
        {job.subjectId ? (
          <span className="block truncate font-mono text-xs text-fg-muted" title={job.subjectId}>
            {job.subjectId}
          </span>
        ) : (
          <span className="text-fg-subtle">{EMPTY_VALUE}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular">
        {formatInteger(job.attempts)}
      </TableCell>
      <TableCell className="text-xs text-fg-muted">
        <RelativeTime value={job.createdAt} />
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular text-fg-muted">
        {duration === null ? EMPTY_VALUE : formatDuration(duration)}
      </TableCell>
      <TableCell className="max-w-64">
        {job.error ? (
          <Tooltip content={job.error}>
            <span className="block truncate text-xs text-danger">{job.error}</span>
          </Tooltip>
        ) : (
          <span className="text-fg-subtle">{EMPTY_VALUE}</span>
        )}
      </TableCell>
    </TableRow>
  )
}
