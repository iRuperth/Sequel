"use client"

import { copy } from "@sequel/copy"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { LAYOUT } from "@/config/constants"
import { NAV_FOOTER, NAV_SECTIONS, type NavItem, isNavItemActive } from "@/config/navigation"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/cn"
import { useLayoutStore } from "./layout-store"

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = isNavItemActive(item, pathname)
  const label = copy.nav[item.key]
  const Icon = item.icon
  return (
    <Tooltip content={label} side="right" disabled={!collapsed}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "group flex h-7 items-center gap-2.5 rounded-md text-sm transition-colors",
          collapsed ? "justify-center px-0" : "px-2",
          active
            ? "bg-accent/15 font-medium text-fg"
            : "text-fg-muted hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? "text-accent-2" : "text-fg-subtle group-hover:text-fg-muted",
          )}
        />
        {collapsed ? null : <span className="truncate">{label}</span>}
      </Link>
    </Tooltip>
  )
}

export function Sidebar() {
  const collapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar)
  const width = collapsed ? LAYOUT.sidebarCollapsedWidth : LAYOUT.sidebarWidth
  return (
    <aside
      aria-label={copy.shell.sidebar.label}
      style={{ width }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150"
    >
      <div
        className={cn(
          "flex h-11 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-1" : "justify-between pr-2 pl-4",
        )}
      >
        {collapsed ? null : (
          <Link href={ROUTES.home} className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
            {copy.app.name}
          </Link>
        )}
        <Tooltip
          content={collapsed ? copy.shell.sidebar.expand : copy.shell.sidebar.collapse}
          side="right"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? copy.shell.sidebar.expand : copy.shell.sidebar.collapse}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </Tooltip>
      </div>
      <nav
        className={cn(
          "flex flex-1 flex-col gap-5 overflow-y-auto py-3",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.key} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-2 mb-1.5 h-px bg-border first:hidden" />
            ) : (
              <div className="px-2 pb-1 text-2xs font-medium tracking-wider text-fg-subtle uppercase">
                {copy.nav.sections[section.key]}
              </div>
            )}
            {section.items.map((item) => (
              <SidebarLink key={item.key} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
      <div
        className={cn(
          "flex flex-col gap-0.5 border-t border-border py-2",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        {NAV_FOOTER.map((item) => (
          <SidebarLink key={item.key} item={item} collapsed={collapsed} />
        ))}
      </div>
    </aside>
  )
}
