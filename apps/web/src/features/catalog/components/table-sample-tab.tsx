import type { CatalogTableDetail } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { Rows3 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StaticGrid } from "@/features/results/components/static-grid"
import { formatInteger } from "@/lib/format"

export function TableSampleTab({ table }: { table: CatalogTableDetail }) {
  const { columns, rows } = table.sample
  if (columns.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Rows3}
          title={copy.catalog.table.sample.emptyTitle}
          description={copy.catalog.table.sample.emptyDescription}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-fg-muted">
        {interpolate(copy.catalog.table.sample.description, { count: formatInteger(rows.length) })}
      </p>
      <StaticGrid columns={columns} rows={rows} maxHeightClass="max-h-[560px]" />
    </div>
  )
}
