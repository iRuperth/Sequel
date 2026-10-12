"use client"

import { copy } from "@sequel/copy"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Breadcrumbs } from "./breadcrumbs"
import { CommandPaletteTrigger } from "./command-palette"
import { HealthIndicator } from "./health-indicator"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function Topbar() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Breadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip content={copy.shell.topbar.environmentHint}>
          <Badge tone="accent" dot className="mr-1 cursor-default">
            {copy.app.environmentBadge}
          </Badge>
        </Tooltip>
        <CommandPaletteTrigger />
        <div className="mx-1 h-5 w-px bg-border" />
        <HealthIndicator />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
