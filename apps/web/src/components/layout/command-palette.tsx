"use client"

import { copy, interpolate } from "@sequel/copy"
import { Command } from "cmdk"
import { Bookmark, ListPlus, type LucideIcon, Moon, Plus, Search, Star, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { KeyCombo } from "@/components/ui/kbd"
import { UI_LIMITS } from "@/config/constants"
import { ALL_NAV_ITEMS } from "@/config/navigation"
import { ROUTES, routeTo } from "@/config/routes"
import { useSavedQueries } from "@/features/saved-queries/api"
import { useWorksheetStore } from "@/features/workbench/model/worksheets-store"
import { useHotkey } from "@/lib/hooks/use-hotkey"
import { useKeyLabels } from "@/lib/hooks/use-platform"
import { useLayoutStore } from "./layout-store"
import { useThemeToggle } from "./theme-toggle"

const PALETTE_HOTKEY = { key: "k", mod: true } as const

function PaletteItem({
  icon: Icon,
  label,
  hint,
  value,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  hint?: ReactNode
  value: string
  onSelect: () => void
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex h-8 cursor-default items-center gap-2.5 rounded-sm px-2 text-sm text-fg outline-none data-[selected=true]:bg-surface-2"
    >
      <Icon className="size-4 shrink-0 text-fg-muted" />
      <span className="truncate">{label}</span>
      {hint ? <span className="ml-auto truncate text-xs text-fg-subtle">{hint}</span> : null}
    </Command.Item>
  )
}

const groupClass =
  "px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:uppercase"

export function CommandPalette() {
  const router = useRouter()
  const open = useLayoutStore((state) => state.paletteOpen)
  const setOpen = useLayoutStore((state) => state.setPaletteOpen)
  const keys = useKeyLabels()
  const { isDark, toggle } = useThemeToggle()
  const savedQueries = useSavedQueries({}, open)
  useHotkey(PALETTE_HOTKEY, () => setOpen(!useLayoutStore.getState().paletteOpen))

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  const recentSaved = [...(savedQueries.data?.items ?? [])]
    .sort(
      (a, b) =>
        Number(b.isFavorite) - Number(a.isFavorite) || b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, UI_LIMITS.paletteSavedQueries)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <DialogPrimitive.Content className="fixed top-[14vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-md border border-border-strong bg-surface animate-fade-in focus:outline-none">
          <DialogPrimitive.Title className="sr-only">
            {copy.shell.palette.title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {copy.shell.palette.placeholder}
          </DialogPrimitive.Description>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-fg-subtle" />
              <Command.Input
                autoFocus
                placeholder={copy.shell.palette.placeholder}
                className="h-11 w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
              />
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto py-1">
              <Command.Empty className="px-4 py-8 text-center text-sm text-fg-muted">
                {copy.shell.palette.empty}
              </Command.Empty>
              <Command.Group heading={copy.shell.palette.groups.actions} className={groupClass}>
                <PaletteItem
                  icon={Plus}
                  value={copy.shell.palette.actions.newQuery}
                  label={copy.shell.palette.actions.newQuery}
                  onSelect={() =>
                    run(() => {
                      useWorksheetStore.getState().createWorksheet()
                      router.push(ROUTES.workbench)
                    })
                  }
                />
                <PaletteItem
                  icon={ListPlus}
                  value={copy.shell.palette.actions.newTask}
                  label={copy.shell.palette.actions.newTask}
                  onSelect={() => run(() => router.push(routeTo.newTask()))}
                />
              </Command.Group>
              <Command.Group heading={copy.shell.palette.groups.navigation} className={groupClass}>
                {ALL_NAV_ITEMS.map((item) => (
                  <PaletteItem
                    key={item.key}
                    icon={item.icon}
                    value={`${copy.shell.palette.groups.navigation} ${copy.nav[item.key]}`}
                    label={copy.nav[item.key]}
                    hint={item.href}
                    onSelect={() => run(() => router.push(item.href))}
                  />
                ))}
              </Command.Group>
              {recentSaved.length > 0 ? (
                <Command.Group
                  heading={copy.shell.palette.groups.savedQueries}
                  className={groupClass}
                >
                  {recentSaved.map((query) => (
                    <PaletteItem
                      key={query.id}
                      icon={query.isFavorite ? Star : Bookmark}
                      value={`${query.name} ${query.id}`}
                      label={interpolate(copy.shell.palette.actions.openSavedQuery, {
                        name: query.name,
                      })}
                      hint={query.tags.join(", ")}
                      onSelect={() =>
                        run(() => router.push(routeTo.workbenchWithSavedQuery(query.id)))
                      }
                    />
                  ))}
                </Command.Group>
              ) : null}
              <Command.Group heading={copy.shell.palette.groups.preferences} className={groupClass}>
                <PaletteItem
                  icon={isDark ? Sun : Moon}
                  value={copy.shell.palette.actions.toggleTheme}
                  label={isDark ? copy.shell.theme.switchToLight : copy.shell.theme.switchToDark}
                  onSelect={() => run(toggle)}
                />
              </Command.Group>
            </Command.List>
            <div className="flex items-center justify-end gap-4 border-t border-border bg-surface-2/40 px-3 py-2 text-2xs text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <KeyCombo keys={[keys.enter]} />
                {copy.shell.palette.footer.select}
              </span>
              <span className="flex items-center gap-1.5">
                <KeyCombo keys={[keys.mod, keys.k]} />
                {copy.shell.palette.footer.close}
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function CommandPaletteTrigger() {
  const setOpen = useLayoutStore((state) => state.setPaletteOpen)
  const keys = useKeyLabels()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={copy.shell.topbar.openCommandPalette}
      className="flex h-7 w-56 items-center gap-2 rounded-md border border-border bg-background/60 pr-1.5 pl-2.5 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted max-md:w-auto"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="truncate max-md:hidden">{copy.shell.topbar.searchPlaceholder}</span>
      <KeyCombo keys={[keys.mod, keys.k]} className="ml-auto max-md:hidden" />
    </button>
  )
}
