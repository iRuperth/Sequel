import type { CatalogTableDetail } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { Columns3, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { DescriptionList } from "@/components/ui/description-list"
import { RelativeTime } from "@/components/ui/relative-time"
import { EMPTY_VALUE, formatInteger } from "@/lib/format"
import { outgoingByColumn, summarizeColumns } from "../model/catalog"
import { OVERVIEW_COLUMN_PREVIEW_LIMIT } from "../model/constants"
import { ColumnLinkIcons, PrimaryKeyIcon } from "./column-badges"

function NameList({ names, empty }: { names: readonly string[]; empty: string }) {
  if (names.length === 0) {
    return <span className="text-fg-subtle">{empty}</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name) => (
        <Badge key={name} mono>
          {name}
        </Badge>
      ))}
    </span>
  )
}

export function TableOverviewTab({
  table,
  onShowColumns,
}: {
  table: CatalogTableDetail
  onShowColumns: () => void
}) {
  const summary = summarizeColumns(table)
  const linksByColumn = outgoingByColumn(table.outgoing)
  const preview = table.columns.slice(0, OVERVIEW_COLUMN_PREVIEW_LIMIT)
  const remaining = table.columns.length - preview.length
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader icon={<Info />} title={copy.catalog.table.overview.detailsTitle} />
        <CardBody>
          <DescriptionList
            columns={2}
            items={[
              { label: copy.catalog.fields.grain, value: table.grain ?? EMPTY_VALUE },
              { label: copy.catalog.fields.owner, value: table.ownerTeam },
              {
                label: copy.catalog.fields.tags,
                value:
                  table.tags.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {table.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="text-fg-subtle">{copy.catalog.fields.noTags}</span>
                  ),
              },
              {
                label: copy.catalog.fields.rowCount,
                value: formatInteger(table.rowCount),
                mono: true,
              },
              {
                label: copy.catalog.fields.columnCount,
                value: formatInteger(table.columnCount),
                mono: true,
              },
              {
                label: copy.catalog.fields.refreshed,
                value: <RelativeTime value={table.refreshedAt} />,
              },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          icon={<Columns3 />}
          title={copy.catalog.table.overview.summaryTitle}
          description={interpolate(copy.catalog.table.overview.summaryDescription, {
            count: formatInteger(table.columns.length),
            nullable: formatInteger(summary.nullableCount),
          })}
          actions={
            <Button variant="ghost" size="xs" onClick={onShowColumns}>
              {copy.catalog.table.overview.viewAllColumns}
            </Button>
          }
        />
        <CardBody className="border-b border-border">
          <DescriptionList
            columns={2}
            items={[
              {
                label: copy.catalog.table.overview.primaryKey,
                value: (
                  <NameList
                    names={summary.primaryKey.map((column) => column.name)}
                    empty={copy.catalog.table.overview.noPrimaryKey}
                  />
                ),
              },
              {
                label: copy.catalog.table.overview.piiColumns,
                value: (
                  <NameList
                    names={summary.pii.map((column) => column.name)}
                    empty={copy.catalog.table.overview.noPiiColumns}
                  />
                ),
              },
              {
                label: copy.catalog.table.overview.references,
                value: interpolate(copy.catalog.table.overview.linkCount, {
                  count: formatInteger(table.outgoing.length),
                }),
              },
              {
                label: copy.catalog.table.overview.referencedBy,
                value: interpolate(copy.catalog.table.overview.linkCount, {
                  count: formatInteger(table.incoming.length),
                }),
              },
            ]}
          />
        </CardBody>
        <ul className="divide-y divide-border">
          {preview.map((column) => (
            <li key={column.name} className="flex h-8 items-center gap-3 px-4">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate font-mono text-xs text-fg">{column.name}</span>
                {column.isPrimaryKey ? <PrimaryKeyIcon /> : null}
                <ColumnLinkIcons links={linksByColumn.get(column.name) ?? []} />
                {column.isPii ? (
                  <Badge tone="warning">{copy.catalog.table.columns.piiBadge}</Badge>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-xs text-fg-muted">{column.dataType}</span>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="px-4 py-2">
              <Button variant="link" size="xs" onClick={onShowColumns}>
                {interpolate(copy.catalog.table.overview.moreColumns, {
                  count: formatInteger(remaining),
                })}
              </Button>
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  )
}
