import type { CatalogLink } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { ArrowRight, Network } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { routeTo } from "@/config/routes"
import { cn } from "@/lib/cn"
import { columnPath, linkKey } from "../model/catalog"

type Endpoint = {
  schema: string
  table: string
  column: string
}

function EndpointLink({ endpoint, current }: { endpoint: Endpoint; current?: boolean }) {
  const label = columnPath(endpoint.schema, endpoint.table, endpoint.column)
  if (current) {
    return <span className="truncate font-mono text-xs text-fg">{label}</span>
  }
  return (
    <Link
      href={routeTo.catalogTable(endpoint.schema, endpoint.table)}
      className="truncate font-mono text-xs text-accent-2 hover:underline"
      title={label}
    >
      {label}
    </Link>
  )
}

type RelationshipListProps = {
  links: readonly CatalogLink[]
  emptyTitle?: string
  emptyDescription: string
  currentTable?: { schema: string; table: string }
  className?: string
}

function isCurrent(endpoint: Endpoint, current?: { schema: string; table: string }): boolean {
  return Boolean(current && current.schema === endpoint.schema && current.table === endpoint.table)
}

export function RelationshipList({
  links,
  emptyTitle,
  emptyDescription,
  currentTable,
  className,
}: RelationshipListProps) {
  if (links.length === 0) {
    return (
      <EmptyState
        compact
        icon={Network}
        title={emptyTitle ?? emptyDescription}
        description={emptyTitle ? emptyDescription : undefined}
      />
    )
  }
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {links.map((link) => {
        const from = { schema: link.fromSchema, table: link.fromTable, column: link.fromColumn }
        const to = { schema: link.toSchema, table: link.toTable, column: link.toColumn }
        return (
          <li
            key={linkKey(link)}
            className="flex min-h-9 items-center gap-3 px-4 py-1.5 transition-colors hover:bg-surface-2/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <EndpointLink endpoint={from} current={isCurrent(from, currentTable)} />
              <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
              <EndpointLink endpoint={to} current={isCurrent(to, currentTable)} />
            </div>
            <Badge tone={link.kind === "foreign_key" ? "accent" : "neutral"}>
              {copy.catalog.linkKinds[link.kind]}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
