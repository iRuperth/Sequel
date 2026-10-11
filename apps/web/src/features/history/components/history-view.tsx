"use client"

import { EXECUTION_SOURCES, EXECUTION_STATUSES } from "@sequel/contracts"
import { copy, executionSourceLabels, executionStatusLabels, interpolate } from "@sequel/copy"
import { ListClock, SearchX, SquareTerminal } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState, InlineError } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { SimpleSelect, type SimpleSelectOption } from "@/components/ui/select"
import { SkeletonTable } from "@/components/ui/skeleton"
import { IndeterminateBar } from "@/components/ui/spinner"
import { FilterBar } from "@/components/ui/toolbar"
import { SELECT_ALL, UI_TIMING } from "@/config/constants"
import { ROUTES } from "@/config/routes"
import { formatInteger } from "@/lib/format"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useHistoryInfinite } from "../api"
import { HISTORY_SKELETON } from "../model/constants"
import { type SourceFilter, type StatusFilter, buildHistoryFilters } from "../model/filters"
import { ExecutionDetailSheet } from "./execution-detail-sheet"
import { HistoryTable } from "./history-table"

const STATUS_OPTIONS: readonly SimpleSelectOption<StatusFilter>[] = [
  { value: SELECT_ALL, label: copy.history.filters.allStatuses },
  ...EXECUTION_STATUSES.map((status) => ({ value: status, label: executionStatusLabels[status] })),
]

const SOURCE_OPTIONS: readonly SimpleSelectOption<SourceFilter>[] = [
  { value: SELECT_ALL, label: copy.history.filters.allSources },
  ...EXECUTION_SOURCES.map((source) => ({ value: source, label: executionSourceLabels[source] })),
]

export function HistoryView() {
  const [status, setStatus] = useState<StatusFilter>(SELECT_ALL)
  const [source, setSource] = useState<SourceFilter>(SELECT_ALL)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), UI_TIMING.searchDebounceMs)
  const filters = useMemo(
    () => buildHistoryFilters(status, source, debouncedSearch),
    [status, source, debouncedSearch],
  )
  const query = useHistoryInfinite(filters, { keepPrevious: true })
  const refreshing = query.isFetching && !query.isFetchingNextPage && !query.isPending
  const inlineError = query.isError && query.data ? query.error : null
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data])
  const hasFilters = status !== SELECT_ALL || source !== SELECT_ALL || search.trim() !== ""
  const clearFilters = () => {
    setStatus(SELECT_ALL)
    setSource(SELECT_ALL)
    setSearch("")
  }

  let content: ReactNode
  if (query.isPending) {
    content = <SkeletonTable rows={HISTORY_SKELETON.rows} columns={HISTORY_SKELETON.columns} />
  } else if (query.isError && !query.data) {
    content = (
      <Card>
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </Card>
    )
  } else if (items.length === 0) {
    content = hasFilters ? (
      <Card>
        <EmptyState
          icon={SearchX}
          title={copy.history.noResultsTitle}
          description={copy.states.noResults}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {copy.states.clearFilters}
            </Button>
          }
        />
      </Card>
    ) : (
      <Card>
        <EmptyState
          icon={ListClock}
          title={copy.history.emptyTitle}
          description={copy.history.emptyDescription}
          action={
            <Button variant="primary" asChild>
              <Link href={ROUTES.workbench}>
                <SquareTerminal />
                {copy.history.openWorkbench}
              </Link>
            </Button>
          }
        />
      </Card>
    )
  } else {
    content = (
      <div className="flex flex-col gap-3">
        <IndeterminateBar className={refreshing ? "opacity-100" : "opacity-0"} />
        <HistoryTable items={items} selectedId={selectedId} onSelect={setSelectedId} />
        {inlineError ? <InlineError error={inlineError} /> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-subtle tabular">
            {interpolate(copy.history.loadedCount, { count: formatInteger(items.length) })}
          </span>
          {query.hasNextPage ? (
            <Button
              variant="secondary"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? copy.states.loadingMore : copy.states.loadMore}
            </Button>
          ) : (
            <span className="text-xs text-fg-subtle">{copy.states.endOfList}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={copy.history.title} description={copy.history.description} />
      <FilterBar role="toolbar" aria-label={copy.history.filters.label}>
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={copy.history.filters.searchPlaceholder}
          aria-label={copy.history.filters.searchLabel}
          className="w-72"
        />
        <SimpleSelect
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel={copy.history.filters.status}
          className="w-40"
        />
        <SimpleSelect
          value={source}
          onValueChange={setSource}
          options={SOURCE_OPTIONS}
          ariaLabel={copy.history.filters.source}
          className="w-40"
        />
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            {copy.states.clearFilters}
          </Button>
        ) : null}
      </FilterBar>
      {content}
      <ExecutionDetailSheet executionId={selectedId} onClose={() => setSelectedId(null)} />
    </PageContainer>
  )
}
