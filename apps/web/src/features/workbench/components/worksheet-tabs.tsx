"use client"

import { copy, executionModeLabels } from "@sequel/copy"
import { FileCode, FlaskConical, Plus, X } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { useRunStore } from "../model/run-store"
import { type Worksheet, isWorksheetDirty, useWorksheetStore } from "../model/worksheets-store"

function TabTitle({
  worksheet,
  editing,
  onDone,
}: {
  worksheet: Worksheet
  editing: boolean
  onDone: () => void
}) {
  const rename = useWorksheetStore((state) => state.rename)
  const [draft, setDraft] = useState(worksheet.title)
  if (!editing) {
    return <span className="truncate">{worksheet.title}</span>
  }
  const commit = () => {
    const next = draft.trim()
    if (next) {
      rename(worksheet.id, next)
    }
    onDone()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commit()
    }
    if (event.key === "Escape") {
      onDone()
    }
  }
  return (
    <input
      autoFocus
      aria-label={copy.workbench.tabs.renameLabel}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
      className="h-5 w-36 rounded-xs border border-accent-2 bg-surface px-1 text-sm text-fg outline-none"
    />
  )
}

export function WorksheetTabs() {
  const worksheets = useWorksheetStore((state) => state.worksheets)
  const activeId = useWorksheetStore((state) => state.activeId)
  const setActive = useWorksheetStore((state) => state.setActive)
  const createWorksheet = useWorksheetStore((state) => state.createWorksheet)
  const closeWorksheet = useWorksheetStore((state) => state.closeWorksheet)
  const closeOthers = useWorksheetStore((state) => state.closeOthers)
  const duplicate = useWorksheetStore((state) => state.duplicate)
  const runs = useRunStore((state) => state.runs)
  const removeRun = useRunStore((state) => state.remove)
  const [editingId, setEditingId] = useState<string | null>(null)

  const close = (id: string) => {
    closeWorksheet(id)
    removeRun(id)
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-border bg-surface">
      <div
        role="tablist"
        aria-label={copy.workbench.tabs.listLabel}
        className="flex min-w-0 items-stretch overflow-x-auto [scrollbar-width:none]"
      >
        {worksheets.map((worksheet) => {
          const active = worksheet.id === activeId
          const running = runs[worksheet.id]?.phase && runs[worksheet.id]?.phase !== "idle"
          const dirty = isWorksheetDirty(worksheet)
          const Icon = worksheet.mode === "scratch" ? FlaskConical : FileCode
          return (
            <ContextMenu key={worksheet.id}>
              <ContextMenuTrigger asChild>
                <div
                  role="tab"
                  tabIndex={0}
                  aria-selected={active}
                  onClick={() => setActive(worksheet.id)}
                  onDoubleClick={() => setEditingId(worksheet.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setActive(worksheet.id)
                    }
                  }}
                  onAuxClick={(event) => {
                    if (event.button === 1) {
                      close(worksheet.id)
                    }
                  }}
                  title={`${worksheet.title} ${copy.common.separator} ${executionModeLabels[worksheet.mode]}`}
                  className={cn(
                    "group relative flex max-w-56 min-w-28 shrink-0 cursor-default items-center gap-1.5 border-r border-border pr-1.5 pl-3 text-sm transition-colors select-none",
                    active
                      ? "bg-[var(--cm-background)] text-fg"
                      : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      worksheet.mode === "scratch"
                        ? "text-warning"
                        : active
                          ? "text-accent-2"
                          : "text-fg-subtle",
                      running && "animate-pulse-soft",
                    )}
                  />
                  <TabTitle
                    worksheet={worksheet}
                    editing={editingId === worksheet.id}
                    onDone={() => setEditingId(null)}
                  />
                  <span className="ml-auto flex size-5 shrink-0 items-center justify-center">
                    {dirty ? (
                      <Tooltip content={copy.workbench.tabs.unsaved}>
                        <span className="size-1.5 rounded-full bg-fg-muted group-hover:hidden" />
                      </Tooltip>
                    ) : null}
                    <button
                      type="button"
                      aria-label={copy.workbench.tabs.close}
                      onClick={(event) => {
                        event.stopPropagation()
                        close(worksheet.id)
                      }}
                      className={cn(
                        "items-center justify-center rounded-xs p-0.5 text-fg-subtle hover:bg-surface-3 hover:text-fg",
                        dirty
                          ? "hidden group-hover:flex"
                          : active
                            ? "flex"
                            : "hidden group-hover:flex",
                      )}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => setEditingId(worksheet.id)}>
                  {copy.workbench.tabs.rename}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => duplicate(worksheet.id)}>
                  {copy.workbench.tabs.duplicate}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => close(worksheet.id)}>
                  {copy.workbench.tabs.close}
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={worksheets.length < 2}
                  onSelect={() => closeOthers(worksheet.id)}
                >
                  {copy.workbench.tabs.closeOthers}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center px-1.5">
        <Tooltip content={copy.workbench.tabs.newTab}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copy.workbench.tabs.newTab}
            onClick={() => createWorksheet()}
          >
            <Plus />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
