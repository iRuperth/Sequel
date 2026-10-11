import type { DatasetSummary } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Database, Users } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import { routeTo } from "@/config/routes"
import { formatCompact, formatInteger } from "@/lib/format"

function CardMetric({
  label,
  children,
  title,
}: {
  label: string
  children: ReactNode
  title?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-2xs font-medium uppercase tracking-wide text-fg-subtle">{label}</span>
      <span className="truncate font-mono text-sm text-fg tabular" title={title}>
        {children}
      </span>
    </div>
  )
}

export function DatasetCard({ dataset }: { dataset: DatasetSummary }) {
  return (
    <Link
      href={routeTo.catalogDataset(dataset.slug)}
      className="group flex flex-col gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2/60 focus-visible:border-accent-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-2">
            <Database className="size-4" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-md font-semibold text-fg">{dataset.name}</h3>
            <span className="truncate font-mono text-xs text-fg-muted">{dataset.slug}</span>
          </div>
        </div>
        <Badge className="shrink-0">{dataset.domain}</Badge>
      </div>
      <p className="line-clamp-2 min-h-9 text-sm text-fg-muted">{dataset.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
          <Users className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <span className="truncate">{dataset.ownerTeam}</span>
        </span>
        {dataset.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {dataset.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border pt-3">
        <CardMetric label={copy.catalog.datasets.tables}>
          {formatInteger(dataset.tableCount)}
        </CardMetric>
        <CardMetric label={copy.catalog.datasets.rows} title={formatInteger(dataset.totalRows)}>
          {formatCompact(dataset.totalRows)}
        </CardMetric>
        <CardMetric label={copy.catalog.datasets.refreshed}>
          <RelativeTime value={dataset.refreshedAt} className="font-sans text-sm" />
        </CardMetric>
      </div>
    </Link>
  )
}
