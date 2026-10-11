"use client"

import type { InteractiveExecutionMode } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/config/constants"
import { createId } from "@/lib/ids"

export type Worksheet = {
  id: string
  title: string
  sql: string
  mode: InteractiveExecutionMode
  savedQueryId: string | null
  savedSql: string | null
  createdAt: number
}

export type WorksheetInit = Partial<
  Pick<Worksheet, "title" | "sql" | "mode" | "savedQueryId" | "savedSql">
>

type WorksheetState = {
  worksheets: Worksheet[]
  activeId: string | null
  counter: number
  createWorksheet: (init?: WorksheetInit) => string
  closeWorksheet: (id: string) => void
  closeOthers: (id: string) => void
  setActive: (id: string) => void
  updateSql: (id: string, sql: string) => void
  setMode: (id: string, mode: InteractiveExecutionMode) => void
  rename: (id: string, title: string) => void
  linkSaved: (id: string, savedQueryId: string, title: string, sql: string) => void
  duplicate: (id: string) => string | null
  ensureWorksheet: () => string
}

function buildWorksheet(counter: number, init: WorksheetInit = {}): Worksheet {
  return {
    id: createId(),
    title: init.title ?? interpolate(copy.workbench.tabs.untitled, { number: counter }),
    sql: init.sql ?? copy.workbench.defaultSql,
    mode: init.mode ?? "read",
    savedQueryId: init.savedQueryId ?? null,
    savedSql: init.savedSql ?? null,
    createdAt: Date.now(),
  }
}

function patch(worksheets: Worksheet[], id: string, change: Partial<Worksheet>): Worksheet[] {
  return worksheets.map((worksheet) =>
    worksheet.id === id ? { ...worksheet, ...change } : worksheet,
  )
}

export const useWorksheetStore = create<WorksheetState>()(
  persist(
    (set, get) => ({
      worksheets: [],
      activeId: null,
      counter: 0,
      createWorksheet: (init) => {
        const counter = get().counter + 1
        const worksheet = buildWorksheet(counter, init)
        set((state) => ({
          worksheets: [...state.worksheets, worksheet],
          activeId: worksheet.id,
          counter,
        }))
        return worksheet.id
      },
      closeWorksheet: (id) => {
        const { worksheets, activeId } = get()
        const index = worksheets.findIndex((worksheet) => worksheet.id === id)
        if (index < 0) {
          return
        }
        const remaining = worksheets.filter((worksheet) => worksheet.id !== id)
        if (remaining.length === 0) {
          const counter = get().counter + 1
          const fresh = buildWorksheet(counter)
          set({ worksheets: [fresh], activeId: fresh.id, counter })
          return
        }
        const nextActive =
          activeId === id
            ? (remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
            : activeId
        set({ worksheets: remaining, activeId: nextActive })
      },
      closeOthers: (id) =>
        set((state) => ({
          worksheets: state.worksheets.filter((worksheet) => worksheet.id === id),
          activeId: id,
        })),
      setActive: (id) => set({ activeId: id }),
      updateSql: (id, sql) =>
        set((state) => ({ worksheets: patch(state.worksheets, id, { sql }) })),
      setMode: (id, mode) =>
        set((state) => ({ worksheets: patch(state.worksheets, id, { mode }) })),
      rename: (id, title) =>
        set((state) => ({ worksheets: patch(state.worksheets, id, { title }) })),
      linkSaved: (id, savedQueryId, title, sql) =>
        set((state) => ({
          worksheets: patch(state.worksheets, id, { savedQueryId, title, savedSql: sql }),
        })),
      duplicate: (id) => {
        const source = get().worksheets.find((worksheet) => worksheet.id === id)
        if (!source) {
          return null
        }
        return get().createWorksheet({
          title: `${source.title} ${copy.workbench.tabs.copySuffix}`,
          sql: source.sql,
          mode: source.mode,
        })
      },
      ensureWorksheet: () => {
        const { worksheets, activeId } = get()
        if (worksheets.length > 0) {
          const active = worksheets.find((worksheet) => worksheet.id === activeId) ?? worksheets[0]
          if (active) {
            if (active.id !== activeId) {
              set({ activeId: active.id })
            }
            return active.id
          }
        }
        return get().createWorksheet()
      },
    }),
    {
      name: STORAGE_KEYS.worksheets,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        worksheets: state.worksheets,
        activeId: state.activeId,
        counter: state.counter,
      }),
    },
  ),
)

function subscribeHydration(callback: () => void): () => void {
  const unsubscribeStart = useWorksheetStore.persist.onHydrate(callback)
  const unsubscribeFinish = useWorksheetStore.persist.onFinishHydration(callback)
  return () => {
    unsubscribeStart()
    unsubscribeFinish()
  }
}

export function useWorksheetsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useWorksheetStore.persist.hasHydrated(),
    () => false,
  )
}

export function isWorksheetDirty(worksheet: Worksheet): boolean {
  return worksheet.savedQueryId !== null && worksheet.savedSql !== worksheet.sql
}
