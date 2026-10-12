import type { CatalogLink } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { KeyRound, Link2 } from "lucide-react"
import Link from "next/link"
import { Tooltip } from "@/components/ui/tooltip"
import { routeTo } from "@/config/routes"
import { linkKey, linkTargetPath } from "../model/catalog"

export function PrimaryKeyIcon() {
  return (
    <Tooltip content={copy.catalog.table.columns.primaryKey}>
      <span
        tabIndex={0}
        aria-label={copy.catalog.table.columns.primaryKey}
        className="inline-flex shrink-0 rounded-xs text-warning outline-none focus-visible:bg-surface-3"
      >
        <KeyRound className="size-3.5" aria-hidden />
      </span>
    </Tooltip>
  )
}

export function ColumnLinkIcons({ links }: { links: readonly CatalogLink[] }) {
  return (
    <>
      {links.map((link) => {
        const label = interpolate(copy.catalog.table.columns.references, {
          target: linkTargetPath(link),
        })
        return (
          <Tooltip key={linkKey(link)} content={label}>
            <Link
              href={routeTo.catalogTable(link.toSchema, link.toTable)}
              aria-label={label}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex shrink-0 rounded-xs text-accent-2 hover:text-fg"
            >
              <Link2 className="size-3.5" aria-hidden />
            </Link>
          </Tooltip>
        )
      })}
    </>
  )
}
