"use client"

import type { SavedQuery, SavedQueryListQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { Bookmark, Plus, SearchX, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SkeletonTable } from "@/components/ui/skeleton"
import { IndeterminateBar } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { FilterBar } from "@/components/ui/toolbar"
import { UI_TIMING } from "@/config/constants"
import { ROUTES } from "@/config/routes"
import { useWorksheetStore } from "@/features/workbench/model/worksheets-store"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useDeleteSavedQuery, useSavedQueries } from "../api"
import {
  SAVED_QUERIES_SKELETON,
  SAVED_QUERY_SCOPES,
  type SavedQueryScope,
} from "../model/constants"
import { collectTags, matchesTags } from "../model/tags"
import { SavedQueriesTable } from "./saved-queries-table"
import { SavedQueryEditDialog } from "./saved-query-edit-dialog"
import { SavedQuerySheet } from "./saved-query-sheet"
import { TagFilter } from "./tag-filter"

const SCOPE_OPTIONS = [
  { value: SAVED_QUERY_SCOPES.all, label: copy.savedQueries.filters.all },
  { value: SAVED_QUERY_SCOPES.favourites, label: copy.savedQueries.filters.favourites },
] as const

function findById(lists: readonly (readonly SavedQuery[])[], id: string | null): SavedQuery | null {
  if (!id) {
    return null
  }
  for (const list of lists) {
    const found = list.find((item) => item.id === id)
    if (found) {
      return found
    }
  }
  return null
}

export function SavedQueriesView() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState<SavedQueryScope>(SAVED_QUERY_SCOPES.all)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SavedQuery | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), UI_TIMING.searchDebounceMs)
  const params = useMemo<SavedQueryListQuery>(
    () => ({
      search: debouncedSearch || undefined,
      favorites: scope === SAVED_QUERY_SCOPES.favourites ? "true" : undefined,
    }),
    [debouncedSearch, scope],
  )
  const listQuery = useSavedQueries(params, true, { keepPrevious: true })
  const allQuery = useSavedQueries()
  const deleteMutation = useDeleteSavedQuery()

  const allItems = useMemo(() => allQuery.data?.items ?? [], [allQuery.data])
  const listItems = useMemo(() => listQuery.data?.items ?? [], [listQuery.data])
  const tagCounts = useMemo(() => collectTags(allItems), [allItems])
  const items = useMemo(
    () => listItems.filter((item) => matchesTags(item, selectedTags)),
    [listItems, selectedTags],
  )
  const selected = findById([listItems, allItems], selectedId)
  const editing = findById([listItems, allItems], editingId)
  const hasFilters =
    search.trim() !== "" || scope !== SAVED_QUERY_SCOPES.all || selectedTags.length > 0
  const onlyFavouritesScope =
    scope === SAVED_QUERY_SCOPES.favourites && search.trim() === "" && selectedTags.length === 0

  const clearFilters = () => {
    setSearch("")
    setScope(SAVED_QUERY_SCOPES.all)
    setSelectedTags([])
  }
  const toggleTag = (tag: string) =>
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  const newQuery = () => {
    useWorksheetStore.getState().createWorksheet()
    router.push(ROUTES.workbench)
  }
  const confirmDelete = () => {
    if (!deleting) {
      return
    }
    const target = deleting
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(copy.savedQueries.delete.deleted)
        setDeleting(null)
        setSelectedId((current) => (current === target.id ? null : current))
        setEditingId((current) => (current === target.id ? null : current))
      },
      onError: (error) => toast.fromError(error),
    })
  }

  const newQueryButton = (
    <Button variant="primary" onClick={newQuery}>
      <Plus />
      {copy.savedQueries.newQuery}
    </Button>
  )

  let content: ReactNode
  if (listQuery.isPending) {
    content = (
      <SkeletonTable rows={SAVED_QUERIES_SKELETON.rows} columns={SAVED_QUERIES_SKELETON.columns} />
    )
  } else if (listQuery.isError) {
    content = (
      <Card>
        <ErrorState
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          retrying={listQuery.isFetching}
        />
      </Card>
    )
  } else if (items.length === 0 && !hasFilters) {
    content = (
      <Card>
        <EmptyState
          icon={Bookmark}
          title={copy.savedQueries.emptyTitle}
          description={copy.savedQueries.emptyDescription}
          action={newQueryButton}
        />
      </Card>
    )
  } else if (items.length === 0) {
    content = (
      <Card>
        <EmptyState
          icon={onlyFavouritesScope ? Star : SearchX}
          title={
            onlyFavouritesScope
              ? copy.savedQueries.noFavouritesTitle
              : copy.savedQueries.noResultsTitle
          }
          description={
            onlyFavouritesScope ? copy.savedQueries.noFavouritesDescription : copy.states.noResults
          }
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {copy.states.clearFilters}
            </Button>
          }
        />
      </Card>
    )
  } else {
    content = (
      <div className="flex flex-col gap-2">
        <IndeterminateBar
          className={
            listQuery.isFetching && listQuery.isPlaceholderData ? "opacity-100" : "opacity-0"
          }
        />
        <SavedQueriesTable
          items={items}
          selectedId={selectedId}
          onSelect={(query) => setSelectedId(query.id)}
          onEdit={(query) => setEditingId(query.id)}
          onDelete={setDeleting}
        />
        <p className="text-xs text-fg-subtle tabular">
          {interpolate(copy.states.showingCount, {
            shown: items.length,
            total: allItems.length || items.length,
          })}
        </p>
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={copy.savedQueries.title}
        description={copy.savedQueries.description}
        actions={newQueryButton}
      />
      <FilterBar role="toolbar" aria-label={copy.savedQueries.filters.label}>
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={copy.savedQueries.filters.searchPlaceholder}
          aria-label={copy.savedQueries.filters.searchLabel}
          className="w-80"
        />
        <SegmentedControl
          value={scope}
          onValueChange={setScope}
          options={SCOPE_OPTIONS}
          ariaLabel={copy.savedQueries.filters.scopeLabel}
        />
        {hasFilters ? (
          <Button variant="ghost" onClick={clearFilters}>
            {copy.states.clearFilters}
          </Button>
        ) : null}
      </FilterBar>
      <TagFilter
        tags={tagCounts}
        selected={selectedTags}
        onToggle={toggleTag}
        onClear={() => setSelectedTags([])}
      />
      {content}
      <SavedQuerySheet
        query={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(query) => setEditingId(query.id)}
        onDelete={setDeleting}
      />
      <SavedQueryEditDialog query={editing} onClose={() => setEditingId(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleting(null)
          }
        }}
        title={copy.savedQueries.delete.title}
        description={
          deleting
            ? interpolate(copy.savedQueries.delete.description, { name: deleting.name })
            : null
        }
        confirmLabel={copy.savedQueries.delete.confirm}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  )
}
