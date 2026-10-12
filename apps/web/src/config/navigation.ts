import type { copy } from "@sequel/copy"
import {
  Activity,
  BookOpen,
  Bookmark,
  CalendarClock,
  ChartLine,
  House,
  LayoutDashboard,
  ListClock,
  ListTodo,
  type LucideIcon,
  Settings,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react"
import { ROUTES } from "./routes"

type NavCopy = typeof copy.nav
export type NavKey = Exclude<keyof NavCopy, "sections">
export type NavSectionKey = keyof NavCopy["sections"]

export type NavItem = {
  key: NavKey
  href: string
  icon: LucideIcon
  exact?: boolean
}

export type NavSection = {
  key: NavSectionKey
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "workspace",
    items: [
      { key: "home", href: ROUTES.home, icon: House, exact: true },
      { key: "workbench", href: ROUTES.workbench, icon: SquareTerminal },
      { key: "tasks", href: ROUTES.tasks, icon: ListTodo },
      { key: "progress", href: ROUTES.progress, icon: ChartLine },
    ],
  },
  {
    key: "data",
    items: [
      { key: "catalog", href: ROUTES.catalog, icon: BookOpen },
      { key: "history", href: ROUTES.history, icon: ListClock },
      { key: "savedQueries", href: ROUTES.savedQueries, icon: Bookmark },
    ],
  },
  {
    key: "operations",
    items: [
      { key: "dashboards", href: ROUTES.dashboards, icon: LayoutDashboard },
      { key: "jobs", href: ROUTES.jobs, icon: CalendarClock },
      { key: "quality", href: ROUTES.quality, icon: ShieldCheck },
    ],
  },
]

export const NAV_FOOTER: NavItem[] = [
  { key: "settings", href: ROUTES.settings, icon: Settings },
  { key: "status", href: ROUTES.status, icon: Activity },
]

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...NAV_FOOTER,
]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => isNavItemActive(item, pathname))
}
