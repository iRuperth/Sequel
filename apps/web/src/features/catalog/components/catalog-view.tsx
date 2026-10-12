"use client"

import { copy } from "@sequel/copy"
import { useIsFetching } from "@tanstack/react-query"
import { useState } from "react"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { UI_TIMING } from "@/config/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { catalogKeys } from "../api"
import { useCatalogRefresh } from "../model/use-catalog-refresh"
import { CatalogSearchInput } from "./catalog-search-input"
import { CatalogSearchResults } from "./catalog-search-results"
import { DatasetGrid } from "./dataset-grid"
import { RefreshCatalogButton, RefreshCatalogProgress } from "./refresh-catalog"

export function CatalogView() {
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search.trim(), UI_TIMING.searchDebounceMs)
  const term = search.trim() ? debounced : ""
  const searching = useIsFetching({ queryKey: catalogKeys.search(term) }) > 0
  const refresh = useCatalogRefresh()
  return (
    <PageContainer>
      <PageHeader
        title={copy.catalog.title}
        description={copy.catalog.description}
        actions={<RefreshCatalogButton running={refresh.running} onRefresh={refresh.start} />}
        meta={refresh.running ? <RefreshCatalogProgress snapshot={refresh.snapshot} /> : null}
      />
      <CatalogSearchInput
        value={search}
        onValueChange={setSearch}
        busy={Boolean(term) && searching}
        className="mb-6"
      />
      {term ? <CatalogSearchResults term={term} /> : <DatasetGrid />}
    </PageContainer>
  )
}
