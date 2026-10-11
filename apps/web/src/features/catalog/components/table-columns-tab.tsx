import type { CatalogTableDetail } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Columns3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompact, formatInteger, formatPercent } from "@/lib/format"
import { outgoingByColumn } from "../model/catalog"
import { ColumnLinkIcons, PrimaryKeyIcon } from "./column-badges"

export function TableColumnsTab({ table }: { table: CatalogTableDetail }) {
  if (table.columns.length === 0) {
    return (
      <Card>
        <EmptyState compact icon={Columns3} title={copy.catalog.table.columns.empty} />
      </Card>
    )
  }
  const linksByColumn = outgoingByColumn(table.outgoing)
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-right">{copy.catalog.table.columns.ordinal}</TableHead>
            <TableHead>{copy.catalog.table.columns.name}</TableHead>
            <TableHead>{copy.catalog.table.columns.dataType}</TableHead>
            <TableHead>{copy.catalog.table.columns.nullable}</TableHead>
            <TableHead>{copy.catalog.table.columns.pii}</TableHead>
            <TableHead>{copy.catalog.table.columns.description}</TableHead>
            <TableHead className="text-right">{copy.catalog.table.columns.nullPercent}</TableHead>
            <TableHead className="text-right">{copy.catalog.table.columns.distinct}</TableHead>
            <TableHead>{copy.catalog.table.columns.examples}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.columns.map((column) => {
            const links = linksByColumn.get(column.name) ?? []
            return (
              <TableRow key={column.name}>
                <TableCell className="text-right font-mono text-xs text-fg-subtle tabular">
                  {column.ordinal}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium text-fg">{column.name}</span>
                    {column.isPrimaryKey ? <PrimaryKeyIcon /> : null}
                    {links.length > 0 ? <ColumnLinkIcons links={links} /> : null}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap text-fg-muted">
                  {column.dataType}
                </TableCell>
                <TableCell className="text-fg-muted">
                  {column.isNullable ? copy.common.yes : copy.common.no}
                </TableCell>
                <TableCell>
                  {column.isPii ? (
                    <Badge tone="warning">{copy.catalog.table.columns.piiBadge}</Badge>
                  ) : null}
                </TableCell>
                <TableCell className="min-w-56 max-w-[420px] py-1.5 text-fg-muted">
                  <span className="line-clamp-2" title={column.description}>
                    {column.description}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs whitespace-nowrap tabular">
                  {formatPercent(column.nullFraction)}
                </TableCell>
                <TableCell
                  className="text-right font-mono text-xs whitespace-nowrap tabular"
                  title={formatInteger(column.distinctCount)}
                >
                  {formatCompact(column.distinctCount)}
                </TableCell>
                <TableCell className="py-1.5">
                  <div className="flex max-w-80 flex-wrap gap-1">
                    {column.exampleValues.map((value, index) => (
                      <span
                        key={`${value}-${index}`}
                        title={value}
                        className="max-w-40 truncate rounded-xs bg-surface-2 px-1.5 py-px font-mono text-2xs text-fg-muted"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
