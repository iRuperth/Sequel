"use client"

import { copy } from "@sequel/copy"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { findNavItem } from "@/config/navigation"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/cn"
import { useBreadcrumbStore } from "./breadcrumb-store"

type Crumb = {
  href: string
  label: string
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const labels = useBreadcrumbStore((state) => state.labels)
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = []
  if (segments.length === 0) {
    crumbs.push({ href: ROUTES.home, label: copy.nav.home })
  }
  let path = ""
  segments.forEach((segment, index) => {
    path = `${path}/${segment}`
    if (index === 0) {
      const item = findNavItem(path)
      crumbs.push({ href: path, label: item ? copy.nav[item.key] : safeDecode(segment) })
      return
    }
    crumbs.push({ href: path, label: labels[path] ?? safeDecode(segment) })
  })
  return (
    <nav aria-label={copy.shell.topbar.breadcrumbLabel} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-fg-subtle" /> : null}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-fg">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn("truncate text-fg-muted transition-colors hover:text-fg")}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
