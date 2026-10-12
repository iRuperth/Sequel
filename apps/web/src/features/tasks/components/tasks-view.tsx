"use client"

import {
  DIFFICULTIES,
  type Difficulty,
  TASK_STATUSES,
  TRACKS,
  type TaskStatus,
  type Track,
} from "@sequel/contracts"
import { copy, difficultyLabels, interpolate, taskStatusLabels, trackLabels } from "@sequel/copy"
import { Plus, SearchX, Ticket } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { SimpleSelect } from "@/components/ui/select"
import { SkeletonTable } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FilterBar } from "@/components/ui/toolbar"
import { SELECT_ALL, UI_TIMING } from "@/config/constants"
import { ROUTE_PARAMS, ROUTES } from "@/config/routes"
import { cn } from "@/lib/cn"
import { formatInteger } from "@/lib/format"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { type TaskFilters, useDatasets, useTasksInfinite } from "../api"
import { TASK_SKELETON_COLUMNS, TASK_SKELETON_ROWS } from "../model/constants"
import { NewTaskDialog } from "./new-task-dialog"
import { TaskTable } from "./task-table"

type StatusTab = TaskStatus | typeof SELECT_ALL
type TrackFilter = Track | typeof SELECT_ALL
type DifficultyFilter = Difficulty | typeof SELECT_ALL

const TRACK_OPTIONS = [
  { value: SELECT_ALL, label: copy.tasks.list.allTracks },
  ...TRACKS.map((track) => ({ value: track, label: trackLabels[track] })),
] as const

const DIFFICULTY_OPTIONS = [
  { value: SELECT_ALL, label: copy.tasks.list.allDifficulties },
  ...DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficultyLabels[difficulty] })),
] as const

function NewTaskDialogController({
  localOpen,
  onLocalOpenChange,
}: {
  localOpen: boolean
  onLocalOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlOpen = searchParams.get(ROUTE_PARAMS.newTask) === ROUTE_PARAMS.newTaskValue
  const onOpenChange = (next: boolean) => {
    onLocalOpenChange(next)
    if (!next && urlOpen) {
      router.replace(ROUTES.tasks)
    }
  }
  return <NewTaskDialog open={localOpen || urlOpen} onOpenChange={onOpenChange} />
}

function ticketCountLabel(count: number): string {
  return count === 1
    ? copy.tasks.list.oneTicket
    : interpolate(copy.tasks.list.ticketCount, { count: formatInteger(count) })
}

export function TasksView() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [status, setStatus] = useState<StatusTab>(SELECT_ALL)
  const [track, setTrack] = useState<TrackFilter>(SELECT_ALL)
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(SELECT_ALL)
  const [dataset, setDataset] = useState<string>(SELECT_ALL)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), UI_TIMING.searchDebounceMs)
  const datasets = useDatasets()

  const filters = useMemo<TaskFilters>(
    () => ({
      status: status === SELECT_ALL ? undefined : status,
      track: track === SELECT_ALL ? undefined : track,
      difficulty: difficulty === SELECT_ALL ? undefined : difficulty,
      datasetSlug: dataset === SELECT_ALL ? undefined : dataset,
      search: debouncedSearch || undefined,
    }),
    [status, track, difficulty, dataset, debouncedSearch],
  )
  const query = useTasksInfinite(filters)
  const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const counts = query.data?.pages[0]?.counts
  const total = counts ? TASK_STATUSES.reduce((sum, item) => sum + (counts[item] ?? 0), 0) : null
  const hasFilters =
    track !== SELECT_ALL || difficulty !== SELECT_ALL || dataset !== SELECT_ALL || search !== ""

  const datasetOptions = useMemo(() => {
    const items = [...(datasets.data?.items ?? [])].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    )
    return [
      { value: SELECT_ALL, label: copy.tasks.list.allDatasets },
      ...items.map((item) => ({ value: item.slug, label: item.name })),
    ]
  }, [datasets.data])

  const clearFilters = () => {
    setTrack(SELECT_ALL)
    setDifficulty(SELECT_ALL)
    setDataset(SELECT_ALL)
    setSearch("")
  }

  const openDialog = () => setDialogOpen(true)
  const newTaskButton = (
    <Button variant="primary" onClick={openDialog}>
      <Plus />
      {copy.actions.newTask}
    </Button>
  )

  const renderBody = () => {
    if (query.isPending) {
      return <SkeletonTable rows={TASK_SKELETON_ROWS} columns={TASK_SKELETON_COLUMNS} />
    }
    if (query.isError && tasks.length === 0) {
      return (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isRefetching}
          />
        </div>
      )
    }
    if (tasks.length === 0) {
      const filtered = hasFilters || status !== SELECT_ALL
      return (
        <div className="rounded-md border border-border bg-surface">
          {filtered ? (
            <EmptyState
              icon={SearchX}
              title={copy.tasks.list.noMatchesTitle}
              description={copy.tasks.list.noMatchesDescription}
              action={
                hasFilters ? (
                  <Button onClick={clearFilters}>{copy.states.clearFilters}</Button>
                ) : null
              }
            />
          ) : (
            <EmptyState
              icon={Ticket}
              title={copy.tasks.list.emptyTitle}
              description={copy.tasks.list.emptyDescription}
              action={newTaskButton}
            />
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
          <TaskTable tasks={tasks} />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
          <span className="tabular">{ticketCountLabel(tasks.length)}</span>
          {query.hasNextPage ? (
            <Button
              size="sm"
              onClick={() => void query.fetchNextPage()}
              loading={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? copy.states.loadingMore : copy.states.loadMore}
            </Button>
          ) : (
            <span className="text-fg-subtle">{copy.states.endOfList}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title={copy.tasks.title}
        description={copy.tasks.description}
        actions={newTaskButton}
      />
      <Tabs value={status} onValueChange={(next) => setStatus(next as StatusTab)}>
        <TabsList
          variant="underline"
          aria-label={copy.tasks.list.statusTabsLabel}
          className="overflow-x-auto"
        >
          <TabsTrigger value={SELECT_ALL} count={total === null ? undefined : formatInteger(total)}>
            {copy.tasks.list.all}
          </TabsTrigger>
          {TASK_STATUSES.map((item) => (
            <TabsTrigger
              key={item}
              value={item}
              count={counts ? formatInteger(counts[item] ?? 0) : undefined}
            >
              {taskStatusLabels[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <FilterBar className="pt-3">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={copy.tasks.list.searchPlaceholder}
          aria-label={copy.tasks.list.searchPlaceholder}
          className="w-64"
        />
        <SimpleSelect
          value={track}
          onValueChange={setTrack}
          options={TRACK_OPTIONS}
          ariaLabel={copy.tasks.list.trackFilter}
          className="w-40"
        />
        <SimpleSelect
          value={difficulty}
          onValueChange={setDifficulty}
          options={DIFFICULTY_OPTIONS}
          ariaLabel={copy.tasks.list.difficultyFilter}
          className="w-40"
        />
        <SimpleSelect
          value={dataset}
          onValueChange={setDataset}
          options={datasetOptions}
          ariaLabel={copy.tasks.list.datasetFilter}
          className="w-44"
        />
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            {copy.states.clearFilters}
          </Button>
        ) : null}
      </FilterBar>
      {renderBody()}
      <Suspense fallback={null}>
        <NewTaskDialogController localOpen={dialogOpen} onLocalOpenChange={setDialogOpen} />
      </Suspense>
    </PageContainer>
  )
}
