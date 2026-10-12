"use client"

import {
  QUALITY_RUN_STATUSES,
  type JobSnapshot,
  type QualityCheck,
  type QualityRunStatus,
} from "@sequel/contracts"
import {
  copy,
  interpolate,
  qualityCheckKindLabels,
  qualityRunStatusLabels,
  severityLabels,
} from "@sequel/copy"
import { EllipsisVertical, FileClock, Pencil, Play, Plus, ShieldCheck, Trash } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { SearchInput } from "@/components/ui/search-input"
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
import { toast } from "@/components/ui/toast"
import { FilterBar } from "@/components/ui/toolbar"
import { Tooltip } from "@/components/ui/tooltip"
import { SELECT_ALL, UI_TIMING } from "@/config/constants"
import { ToneBadge } from "@/features/jobs/components/status-badges"
import { useJob } from "@/features/jobs/model/use-job"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { qualityRunStatusTone, severityTone } from "@/lib/tones"
import { useQualityChecks, useRunQualityCheck, useToggleQualityCheck } from "../api"
import { checkTarget } from "../model/check-form"
import {
  NEVER_RUN_FILTER,
  QUALITY_SKELETON_COLUMNS,
  QUALITY_SKELETON_ROWS,
} from "../model/constants"

const t = copy.quality

type StatusFilter = QualityRunStatus | typeof NEVER_RUN_FILTER | typeof SELECT_ALL

const STATUS_OPTIONS: SimpleSelectOption<StatusFilter>[] = [
  { value: SELECT_ALL, label: t.filters.allStatuses },
  ...QUALITY_RUN_STATUSES.map((status) => ({
    value: status,
    label: qualityRunStatusLabels[status],
  })),
  { value: NEVER_RUN_FILTER, label: t.filters.neverRun },
]

function matchesStatus(check: QualityCheck, filter: StatusFilter): boolean {
  if (filter === SELECT_ALL) {
    return true
  }
  if (filter === NEVER_RUN_FILTER) {
    return check.lastRun === null
  }
  return check.lastRun?.status === filter
}

function matchesSearch(check: QualityCheck, search: string): boolean {
  if (!search) {
    return true
  }
  const haystack = [check.name, check.description ?? "", checkTarget(check)].join(" ").toLowerCase()
  return haystack.includes(search)
}

type ChecksTableProps = {
  onCreate: () => void
  onEdit: (check: QualityCheck) => void
  onViewRuns: (check: QualityCheck) => void
  onDelete: (check: QualityCheck) => void
}

export function ChecksTable({ onCreate, onEdit, onViewRuns, onDelete }: ChecksTableProps) {
  const checks = useQualityChecks()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>(SELECT_ALL)
  const debouncedSearch = useDebouncedValue(search, UI_TIMING.searchDebounceMs)
  const items = useMemo(() => checks.data?.items ?? [], [checks.data])
  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase()
    return items.filter((check) => matchesSearch(check, needle) && matchesStatus(check, status))
  }, [items, debouncedSearch, status])
  const filtering = search.trim() !== "" || status !== SELECT_ALL
  const clearFilters = () => {
    setSearch("")
    setStatus(SELECT_ALL)
  }

  if (checks.isPending) {
    return <SkeletonTable rows={QUALITY_SKELETON_ROWS} columns={QUALITY_SKELETON_COLUMNS.checks} />
  }
  if (checks.isError) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <ErrorState
          error={checks.error}
          onRetry={() => void checks.refetch()}
          retrying={checks.isRefetching}
        />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface">
        <EmptyState
          icon={ShieldCheck}
          title={t.empty.title}
          description={t.empty.description}
          action={
            <Button variant="primary" onClick={onCreate}>
              <Plus />
              {t.newCheck}
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={t.filters.search}
          aria-label={t.filters.search}
          className="w-64"
        />
        <SimpleSelect
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel={t.filters.status}
          className="w-40"
        />
        {filtering ? (
          <Button variant="ghost" onClick={clearFilters}>
            {copy.states.clearFilters}
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-fg-subtle tabular">
          {interpolate(copy.states.showingCount, { shown: filtered.length, total: items.length })}
        </span>
      </FilterBar>
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface">
          <EmptyState
            compact
            title={copy.states.noResults}
            action={<Button onClick={clearFilters}>{copy.states.clearFilters}</Button>}
          />
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead>{t.columns.target}</TableHead>
                <TableHead>{t.columns.kind}</TableHead>
                <TableHead>{t.columns.severity}</TableHead>
                <TableHead>{t.columns.enabled}</TableHead>
                <TableHead>{t.columns.status}</TableHead>
                <TableHead>{t.columns.lastRun}</TableHead>
                <TableHead className="w-0 text-right">
                  <span className="sr-only">{t.columns.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((check) => (
                <CheckRow
                  key={check.id}
                  check={check}
                  onEdit={() => onEdit(check)}
                  onViewRuns={() => onViewRuns(check)}
                  onDelete={() => onDelete(check)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}

type CheckRowProps = {
  check: QualityCheck
  onEdit: () => void
  onViewRuns: () => void
  onDelete: () => void
}

function CheckRow({ check, onEdit, onViewRuns, onDelete }: CheckRowProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const run = useRunQualityCheck()
  const toggle = useToggleQualityCheck()
  const job = useJob(jobId, {
    onSettled: (snapshot: JobSnapshot) => {
      if (snapshot.status === "succeeded") {
        toast.success(t.runFinished, check.name)
      } else {
        toast.error(t.runFailed, snapshot.error ?? check.name)
      }
      setJobId(null)
    },
  })
  const running = run.isPending || job.isRunning
  const lastRun = check.lastRun

  const runNow = () =>
    run.mutate(check.id, {
      onSuccess: ({ jobId: triggered }) => {
        toast.info(t.runQueued, interpolate(t.runQueuedDescription, { name: check.name }))
        setJobId(triggered)
      },
      onError: (error) => toast.fromError(error),
    })

  const setEnabled = (isEnabled: boolean) =>
    toggle.mutate(
      { check, isEnabled },
      {
        onSuccess: () => toast.success(isEnabled ? t.enabledToast : t.disabledToast),
        onError: (error) => toast.fromError(error),
      },
    )

  return (
    <TableRow>
      <TableCell className="max-w-64 py-1.5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium" title={check.name}>
            {check.name}
          </span>
          {check.description ? (
            <span className="truncate text-xs text-fg-subtle" title={check.description}>
              {check.description}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="max-w-56">
        <span className="block truncate font-mono text-xs text-fg-muted" title={checkTarget(check)}>
          {checkTarget(check)}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap text-fg-muted">
        {qualityCheckKindLabels[check.kind]}
      </TableCell>
      <TableCell>
        <Badge tone={severityTone[check.severity]}>{severityLabels[check.severity]}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={check.isEnabled}
          onCheckedChange={setEnabled}
          aria-label={interpolate(t.toggleLabel, { name: check.name })}
        />
      </TableCell>
      <TableCell className="max-w-72 py-1.5">
        {running ? (
          <ToneBadge tone="info" label={t.running} pulse />
        ) : lastRun ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="inline-flex items-center gap-2">
              <ToneBadge
                tone={qualityRunStatusTone[lastRun.status]}
                label={qualityRunStatusLabels[lastRun.status]}
              />
              {lastRun.observedValue !== null ? (
                <span className="font-mono text-xs whitespace-nowrap text-fg-muted tabular">
                  {interpolate(t.observed, { value: lastRun.observedValue })}
                </span>
              ) : null}
            </span>
            {lastRun.message ? (
              <span className="truncate text-2xs text-fg-subtle" title={lastRun.message}>
                {lastRun.message}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-fg-subtle">{t.notRun}</span>
        )}
      </TableCell>
      <TableCell className="py-1.5 text-xs whitespace-nowrap text-fg-muted">
        <div className="flex flex-col gap-0.5">
          <RelativeTime value={lastRun?.ranAt} />
          {check.cronExpression ? (
            <code className="font-mono text-2xs text-fg-subtle">{check.cronExpression}</code>
          ) : (
            <span className="text-2xs text-fg-subtle">{t.manual}</span>
          )}
        </div>
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
                {t.runsHistory}
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
