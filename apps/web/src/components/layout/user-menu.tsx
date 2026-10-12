"use client"

import { copy, interpolate } from "@sequel/copy"
import { Activity, Moon, Settings, Sun } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { publicConfig } from "@/config/public"
import { ROUTES } from "@/config/routes"
import { useCurrentUser } from "@/features/settings/api"
import { initials } from "@/lib/format"
import { useThemeToggle } from "./theme-toggle"

export function UserMenu() {
  const { data: user, isPending } = useCurrentUser()
  const { isDark, toggle } = useThemeToggle()
  const role = user?.roleTitle ?? copy.shell.user.fallbackRole
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={copy.shell.user.menuLabel}
          className="flex h-8 items-center gap-2 rounded-md py-1 pr-2 pl-1 text-left transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-2xs font-semibold text-accent-2">
            {initials(role)}
          </span>
          <span className="hidden min-w-0 flex-col leading-tight lg:flex">
            {isPending ? (
              <Skeleton className="h-3 w-20" />
            ) : (
              <span className="truncate text-xs font-semibold text-fg">{role}</span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="py-1.5 normal-case tracking-normal">
          <span className="text-sm font-semibold text-fg">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settings}>
            <Settings />
            {copy.nav.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.status}>
            <Activity />
            {copy.nav.status}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={toggle}>
          {isDark ? <Sun /> : <Moon />}
          {isDark ? copy.shell.theme.switchToLight : copy.shell.theme.switchToDark}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1 text-2xs text-fg-subtle">
          <span>{copy.shell.user.workspace}</span>
          <span className="font-mono">
            {interpolate(copy.shell.user.version, { version: publicConfig.appVersion })}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
