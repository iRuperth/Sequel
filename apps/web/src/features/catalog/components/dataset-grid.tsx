"use client"

import { copy, interpolate } from "@sequel/copy"
import { BookOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { SectionHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatasets } from "../api"
import { sortDatasets } from "../model/catalog"
import { CATALOG_SKELETONS } from "../model/constants"
import { DatasetCard } from "./dataset-card"

const GRID_CLASS = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"

function DatasetGridSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: CATALOG_SKELETONS.datasetCards }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DatasetGrid() {
  const query = useDatasets()
  if (query.isPending) {
    return <DatasetGridSkeleton />
  }
  if (query.isError) {
    return (
      <Card>
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </Card>
    )
  }
  const datasets = sortDatasets(query.data.items)
  if (datasets.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title={copy.catalog.datasets.emptyTitle}
          description={copy.catalog.datasets.emptyDescription}
        />
      </Card>
    )
  }
  return (
    <section>
      <SectionHeader
        title={copy.catalog.datasets.sectionTitle}
        description={copy.catalog.datasets.sectionDescription}
        actions={
          <span className="text-xs text-fg-muted tabular">
            {interpolate(copy.catalog.datasets.count, { count: datasets.length })}
          </span>
        }
      />
      <div className={GRID_CLASS}>
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.slug} dataset={dataset} />
        ))}
      </div>
    </section>
  )
}
