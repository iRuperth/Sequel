import type { CatalogTableDetail } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { formatInteger } from "@/lib/format"
import { RelationshipList } from "./relationship-list"

export function TableRelationshipsTab({ table }: { table: CatalogTableDetail }) {
  const current = { schema: table.schema, table: table.name }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          icon={<ArrowUpRight />}
          title={copy.catalog.table.relationships.outgoing}
          description={copy.catalog.table.relationships.outgoingDescription}
          actions={
            <span className="font-mono text-xs text-fg-muted tabular">
              {formatInteger(table.outgoing.length)}
            </span>
          }
        />
        <RelationshipList
          links={table.outgoing}
          emptyDescription={copy.catalog.table.relationships.noOutgoing}
          currentTable={current}
        />
      </Card>
      <Card>
        <CardHeader
          icon={<ArrowDownLeft />}
          title={copy.catalog.table.relationships.incoming}
          description={copy.catalog.table.relationships.incomingDescription}
          actions={
            <span className="font-mono text-xs text-fg-muted tabular">
              {formatInteger(table.incoming.length)}
            </span>
          }
        />
        <RelationshipList
          links={table.incoming}
          emptyDescription={copy.catalog.table.relationships.noIncoming}
          currentTable={current}
        />
      </Card>
    </div>
  )
}
