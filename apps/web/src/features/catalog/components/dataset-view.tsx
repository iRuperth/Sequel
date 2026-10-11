"use client"

import type { DatasetDetail } from "@sequel/contracts"
import { copy, interpolate, relationKindLabels } from "@sequel/copy"
import { Clock, Network, Rows3, Table2, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useBreadcrumbLabel } from "@/components/layout/breadcrumb-store"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader, SectionHeader } from "@/components/ui/page-header"
import { RelativeTime } from "@/components/ui/relative-time"
import { Skeleton, SkeletonRows, SkeletonTable } from "@/components/ui/skeleton"
import { Stat } from "@/components/ui/stat"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROUTES, routeTo } from "@/config/routes"
import { ApiError } from "@/lib/api-client"
import { EMPTY_VALUE, formatCompact, formatInteger } from "@/lib/format"
import { useDataset } from "../api"
import { CATALOG_SKELETONS } from "../model/constants"
import { CatalogNotFound } from "./catalog-not-found"
import { RelationshipList } from "./relationship-list"

const STAT_LABELS = [
  copy.catalog.dataset.stats.tables,
  copy.catalog.dataset.stats.totalRows,
  copy.catalog.dataset.stats.relationships,
  copy.catalog.dataset.stats.refreshed,
] as const

function DatasetSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 pb-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-96 max-w-full" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_LABELS.map((label) => (
          <Stat key={label} label={label} value={null} loading />
        ))}
      </div>
      <SkeletonTable rows={CATALOG_SKELETONS.tableRows} columns={CATALOG_SKELETONS.tableColumns} />
      <SkeletonRows rows={CATALOG_SKELETONS.relationshipRows} />
    </div>
  )
}

function DatasetHeader({ dataset }: { dataset: DatasetDetail }) {
  return (
    <PageHeader
      eyebrow={dataset.domain}
      title={dataset.name}
      description={dataset.description}
      meta={
        <>
          <Badge mono>{dataset.slug}</Badge>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-fg-subtle" aria-hidden />
            <span className="text-fg-subtle">{copy.catalog.fields.owner}</span>
            <span className="text-fg">{dataset.ownerTeam}</span>
          </span>
          {dataset.tags.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1">
              {dataset.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </span>
          ) : null}
        </>
      }
    />
  )
}

function DatasetStats({ dataset }: { dataset: DatasetDetail }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label={copy.catalog.dataset.stats.tables}
        value={formatInteger(dataset.tableCount)}
        icon={<Table2 />}
      />
      <Stat
        label={copy.catalog.dataset.stats.totalRows}
        value={formatCompact(dataset.totalRows)}
        hint={interpolate(copy.catalog.dataset.stats.exactRows, {
          count: formatInteger(dataset.totalRows),
        })}
        icon={<Rows3 />}
      />
      <Stat
        label={copy.catalog.dataset.stats.relationships}
        value={formatInteger(dataset.links.length)}
        icon={<Network />}
      />
      <Stat
        label={copy.catalog.dataset.stats.refreshed}
        value={
          <RelativeTime
            value={dataset.refreshedAt}
            className="font-sans text-lg font-medium tracking-normal"
          />
        }
        hint={dataset.refreshedAt ? null : copy.catalog.dataset.stats.neverRefreshed}
        icon={<Clock />}
      />
    </div>
  )
}

function DatasetTables({ dataset }: { dataset: DatasetDetail }) {
  const router = useRouter()
  return (
    <section>
      <SectionHeader
        title={copy.catalog.dataset.tablesTitle}
        description={copy.catalog.dataset.tablesDescription}
      />
      {dataset.tables.length === 0 ? (
        <Card>
          <EmptyState compact icon={Table2} title={copy.catalog.dataset.noTables} />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.catalog.dataset.columns.name}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.kind}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.description}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.grain}</TableHead>
                <TableHead className="text-right">{copy.catalog.dataset.columns.rows}</TableHead>
                <TableHead className="text-right">{copy.catalog.dataset.columns.columns}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.refreshed}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataset.tables.map((table) => {
                const href = routeTo.catalogTable(table.schema, table.name)
                return (
                  <TableRow key={table.name} interactive onClick={() => router.push(href)}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                        className="font-mono text-xs font-medium text-fg hover:text-accent-2 hover:underline"
                      >
                        {table.name}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge>{relationKindLabels[table.kind]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] text-fg-muted">
                      <span className="line-clamp-1" title={table.description}>
                        {table.description}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-fg-muted">
                      <span className="line-clamp-1" title={table.grain ?? undefined}>
                        {table.grain ?? EMPTY_VALUE}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right font-mono text-xs tabular"
                      title={formatInteger(table.rowCount)}
                    >
                      {formatCompact(table.rowCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">
                      {formatInteger(table.columnCount)}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      <RelativeTime value={table.refreshedAt} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  )
}

function DatasetRelationships({ dataset }: { dataset: DatasetDetail }) {
  return (
    <Card>
      <CardHeader
        icon={<Network />}
        title={copy.catalog.dataset.relationshipsTitle}
        description={copy.catalog.dataset.relationshipsDescription}
        actions={
          <span className="font-mono text-xs text-fg-muted tabular">
            {formatInteger(dataset.links.length)}
          </span>
        }
      />
      <RelationshipList
        links={dataset.links}
        emptyTitle={copy.catalog.dataset.noRelationshipsTitle}
        emptyDescription={copy.catalog.dataset.noRelationships}
      />
    </Card>
  )
}

export function DatasetView({ schema }: { schema: string }) {
  const query = useDataset(schema)
  useBreadcrumbLabel(query.data?.name)
  if (query.isPending) {
    return (
      <PageContainer>
        <DatasetSkeleton />
      </PageContainer>
    )
  }
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.isNotFound) {
      return (
        <PageContainer>
          <CatalogNotFound
            title={copy.catalog.dataset.notFoundTitle}
            description={interpolate(copy.catalog.dataset.notFoundDescription, { slug: schema })}
            backHref={ROUTES.catalog}
            backLabel={copy.catalog.dataset.backToCatalog}
          />
        </PageContainer>
      )
    }
    return (
      <PageContainer>
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </Card>
      </PageContainer>
    )
  }
  const dataset = query.data
  return (
    <PageContainer>
      <DatasetHeader dataset={dataset} />
      <div className="flex flex-col gap-6">
        <DatasetStats dataset={dataset} />
        <DatasetTables dataset={dataset} />
        <DatasetRelationships dataset={dataset} />
      </div>
    </PageContainer>
  )
}
