"use client"

import type { CatalogTableDetail } from "@sequel/contracts"
import { copy, interpolate, relationKindLabels } from "@sequel/copy"
import { ShieldAlert, SquareTerminal } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useBreadcrumbLabel } from "@/components/layout/breadcrumb-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip } from "@/components/ui/tooltip"
import { routeTo } from "@/config/routes"
import { ApiError } from "@/lib/api-client"
import { formatInteger } from "@/lib/format"
import { previewSql, qualifiedName } from "@/lib/sql-templates"
import { useCatalogTable, useDatasets } from "../api"
import { hasPii } from "../model/catalog"
import { CATALOG_SKELETONS, TABLE_TABS, type TableTab } from "../model/constants"
import { CatalogNotFound } from "./catalog-not-found"
import { TableColumnsTab } from "./table-columns-tab"
import { TableOverviewTab } from "./table-overview-tab"
import { TableRelationshipsTab } from "./table-relationships-tab"
import { TableSampleTab } from "./table-sample-tab"

function TableTitle({ schema, table }: { schema: string; table: string }) {
  return (
    <span className="font-mono">
      <span className="text-fg-muted">{schema}.</span>
      {table}
    </span>
  )
}

function TableMeta({ detail }: { detail: CatalogTableDetail }) {
  return (
    <>
      <Badge>{relationKindLabels[detail.kind]}</Badge>
      {hasPii(detail.columns) ? (
        <Tooltip content={copy.catalog.table.piiTooltip}>
          <Badge tone="warning" tabIndex={0}>
            <ShieldAlert className="size-3" aria-hidden />
            {copy.catalog.table.pii}
          </Badge>
        </Tooltip>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <span className="text-fg-subtle">{copy.catalog.fields.owner}</span>
        <span className="text-fg">{detail.ownerTeam}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-fg-subtle">{copy.catalog.fields.rowCount}</span>
        <span className="font-mono text-xs text-fg tabular">{formatInteger(detail.rowCount)}</span>
      </span>
    </>
  )
}

function TableDetailTabs({ detail }: { detail: CatalogTableDetail }) {
  const [tab, setTab] = useState<TableTab>(TABLE_TABS.overview)
  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as TableTab)}>
      <TabsList variant="underline">
        <TabsTrigger value={TABLE_TABS.overview}>{copy.catalog.table.tabs.overview}</TabsTrigger>
        <TabsTrigger value={TABLE_TABS.columns} count={formatInteger(detail.columns.length)}>
          {copy.catalog.table.tabs.columns}
        </TabsTrigger>
        <TabsTrigger value={TABLE_TABS.sample} count={formatInteger(detail.sample.rows.length)}>
          {copy.catalog.table.tabs.sample}
        </TabsTrigger>
        <TabsTrigger
          value={TABLE_TABS.relationships}
          count={formatInteger(detail.outgoing.length + detail.incoming.length)}
        >
          {copy.catalog.table.tabs.relationships}
        </TabsTrigger>
      </TabsList>
      <TabsContent value={TABLE_TABS.overview} className="pt-4">
        <TableOverviewTab table={detail} onShowColumns={() => setTab(TABLE_TABS.columns)} />
      </TabsContent>
      <TabsContent value={TABLE_TABS.columns} className="pt-4">
        <TableColumnsTab table={detail} />
      </TabsContent>
      <TabsContent value={TABLE_TABS.sample} className="pt-4">
        <TableSampleTab table={detail} />
      </TabsContent>
      <TabsContent value={TABLE_TABS.relationships} className="pt-4">
        <TableRelationshipsTab table={detail} />
      </TabsContent>
    </Tabs>
  )
}

function TableActions({ schema, table }: { schema: string; table: string }) {
  return (
    <>
      <CopyButton
        value={qualifiedName(schema, table)}
        label={copy.catalog.table.copyName}
        variant="secondary"
        size="icon-sm"
      />
      <Button variant="primary" asChild>
        <Link href={routeTo.workbenchWithSql(previewSql(schema, table))}>
          <SquareTerminal />
          {copy.catalog.table.queryTable}
        </Link>
      </Button>
    </>
  )
}

function TableLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-border pb-2">
        {Object.values(TABLE_TABS).map((value) => (
          <Skeleton key={value} className="h-4 w-20" />
        ))}
      </div>
      <SkeletonTable
        rows={CATALOG_SKELETONS.overviewRows}
        columns={CATALOG_SKELETONS.tableColumns}
      />
    </div>
  )
}

export function TableView({ schema, table }: { schema: string; table: string }) {
  const query = useCatalogTable(schema, table)
  const datasets = useDatasets()
  const datasetName = datasets.data?.items.find((dataset) => dataset.slug === schema)?.name
  useBreadcrumbLabel(query.data?.name ?? table)
  useBreadcrumbLabel(datasetName, routeTo.catalogDataset(schema))
  if (query.isError && query.error instanceof ApiError && query.error.isNotFound) {
    return (
      <PageContainer>
        <CatalogNotFound
          title={copy.catalog.table.notFoundTitle}
          description={interpolate(copy.catalog.table.notFoundDescription, {
            name: `${schema}.${table}`,
          })}
          backHref={routeTo.catalogDataset(schema)}
          backLabel={copy.catalog.table.backToDataset}
        />
      </PageContainer>
    )
  }
  const detail = query.data
  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href={routeTo.catalogDataset(schema)} className="hover:text-fg hover:underline">
            {datasetName ?? schema}
          </Link>
        }
        title={<TableTitle schema={schema} table={table} />}
        description={detail?.description}
        actions={<TableActions schema={schema} table={table} />}
        meta={
          detail ? (
            <TableMeta detail={detail} />
          ) : query.isPending ? (
            <Skeleton className="h-4 w-96 max-w-full" />
          ) : null
        }
      />
      {query.isPending ? (
        <TableLoading />
      ) : query.isError ? (
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </Card>
      ) : (
        <TableDetailTabs key={`${schema}.${table}`} detail={query.data} />
      )}
    </PageContainer>
  )
}
