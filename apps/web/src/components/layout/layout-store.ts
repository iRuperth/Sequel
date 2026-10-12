"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { LAYOUT, STORAGE_KEYS } from "@/config/constants"

type LayoutState = {
  sidebarCollapsed: boolean
  schemaBrowserOpen: boolean
  resultsRatio: number
  paletteOpen: boolean
  toggleSidebar: () => void
  setSchemaBrowserOpen: (open: boolean) => void
  setResultsRatio: (ratio: number) => void
  setPaletteOpen: (open: boolean) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      schemaBrowserOpen: true,
      resultsRatio: LAYOUT.resultsPanelDefault,
      paletteOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSchemaBrowserOpen: (open) => set({ schemaBrowserOpen: open }),
      setResultsRatio: (ratio) =>
        set({
          resultsRatio: Math.min(Math.max(ratio, LAYOUT.resultsPanelMin), LAYOUT.resultsPanelMax),
        }),
      setPaletteOpen: (open) => set({ paletteOpen: open }),
    }),
    {
      name: STORAGE_KEYS.layout,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        schemaBrowserOpen: state.schemaBrowserOpen,
        resultsRatio: state.resultsRatio,
      }),
    },
  ),
)
