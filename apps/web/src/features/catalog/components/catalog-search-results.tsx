"use client"

import type { CatalogSearchResult } from "@sequel/contracts"
import { copy, interpolate, relationKindLabels } from "@sequel/copy"
import { Columns3, SearchX, Table2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { SectionHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { IndeterminateBar } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { routeTo } from "@/config/routes"
import { formatCompact, formatInteger } from "@/lib/format"
import { useCatalogSearch } from "../api"
import { columnPath } from "../model/catalog"
import { CATALOG_SKELETONS } from "../model/constants"
import { HighlightMatch } from "./highlight-match"

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[copy.catalog.search.tables, copy.catalog.search.columns].map((title) => (
        <section key={title}>
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            {Array.from({ length: CATALOG_SKELETONS.searchRows }, (_, index) => (
              <div
                key={index}
                className="flex h-9 items-center gap-4 border-b border-border px-3 last:border-b-0"
              >
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 flex-1" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SectionCount({ count }: { count: number }) {
  return <span className="font-mono text-xs text-fg-muted tabular">{formatInteger(count)}</span>
}

function TableResults({ tables, term }: { tables: CatalogSearchResult["tables"]; term: string }) {
  const router = useRouter()
  return (
    <section>
      <SectionHeader
        title={copy.catalog.search.tables}
        description={copy.catalog.search.tablesDescription}
        actions={<SectionCount count={tables.length} />}
      />
      {tables.length === 0 ? (
        <Card>
          <EmptyState compact icon={Table2} title={copy.catalog.search.noTables} />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.catalog.dataset.columns.name}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.kind}</TableHead>
                <TableHead>{copy.catalog.dataset.columns.description}</TableHead>
                <TableHead className="text-right">{copy.catalog.dataset.columns.rows}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => {
                const href = routeTo.catalogTable(table.schema, table.name)
                return (
                  <TableRow
                    key={`${table.schema}.${table.name}`}
                    interactive
                    onClick={() => router.push(href)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                        className="font-mono text-xs text-fg hover:text-accent-2 hover:underline"
                      >
                        <span className="text-fg-muted">{table.schema}.</span>
                        <HighlightMatch text={table.name} term={term} />
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge>{relationKindLabels[table.kind]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[520px] text-fg-muted">
                      <span className="line-clamp-1">
                        <HighlightMatch text={table.description} term={term} />
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right font-mono text-xs tabular"
                      title={formatInteger(table.rowCount)}
                    >
                      {formatCompact(table.rowCount)}
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

function ColumnResults({
  columns,
  term,
}: {
  columns: CatalogSearchResult["columns"]
  term: string
}) {
  const router = useRouter()
  return (
    <section>
      <SectionHeader
        title={copy.catalog.search.columns}
        description={copy.catalog.search.columnsDescription}
        actions={<SectionCount count={columns.length} />}
      />
      {columns.length === 0 ? (
        <Card>
          <EmptyState compact icon={Columns3} title={copy.catalog.search.noColumns} />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.catalog.table.columns.name}</TableHead>
                <TableHead>{copy.catalog.table.columns.dataType}</TableHead>
                <TableHead>{copy.catalog.table.columns.description}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => {
                const href = routeTo.catalogTable(column.schema, column.table)
                return (
                  <TableRow
                    key={columnPath(column.schema, column.table, column.column)}
                    interactive
                    onClick={() => router.push(href)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={href}
                        onClick={(event) => event.stopPropagation()}
                        className="font-mono text-xs text-fg hover:text-accent-2 hover:underline"
                      >
                        <span className="text-fg-muted">
                          {columnPath(column.schema, column.table)}.
                        </span>
                        <HighlightMatch text={column.column} term={term} />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap text-fg-muted">
                      {column.dataType}
                    </TableCell>
                    <TableCell className="max-w-[560px] text-fg-muted">
                      <span className="line-clamp-1">
                        <HighlightMatch text={column.description} term={term} />
                      </span>
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

export function CatalogSearchResults({ term }: { term: string }) {
  const query = useCatalogSearch(term)
  if (query.isPending) {
    return <ResultsSkeleton />
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
  const { tables, columns } = query.data
  const stale = query.isPlaceholderData
  if (tables.length === 0 && columns.length === 0 && !stale) {
    return (
      <Card>
        <EmptyState
          icon={SearchX}
          title={copy.catalog.search.noResultsTitle}
          description={interpolate(copy.catalog.search.noResultsDescription, { query: term })}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <IndeterminateBar className={query.isFetching ? "opacity-100" : "opacity-0"} />
        <p className="text-sm text-fg-muted">
          {interpolate(copy.catalog.search.resultSummary, {
            tables: formatInteger(tables.length),
            columns: formatInteger(columns.length),
          })}
        </p>
      </div>
      <TableResults tables={tables} term={term} />
      <ColumnResults columns={columns} term={term} />
    </div>
  )
}
