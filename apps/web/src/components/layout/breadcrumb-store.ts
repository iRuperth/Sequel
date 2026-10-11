"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { create } from "zustand"

type BreadcrumbState = {
  labels: Record<string, string>
  setLabel: (path: string, label: string) => void
  clearLabel: (path: string) => void
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (path, label) => set((state) => ({ labels: { ...state.labels, [path]: label } })),
  clearLabel: (path) =>
    set((state) => {
      const next = { ...state.labels }
      delete next[path]
      return { labels: next }
    }),
}))

export function useBreadcrumbLabel(label: string | null | undefined, path?: string): void {
  const pathname = usePathname()
  const target = path ?? pathname
  const setLabel = useBreadcrumbStore((state) => state.setLabel)
  const clearLabel = useBreadcrumbStore((state) => state.clearLabel)
  useEffect(() => {
    if (!label) {
      return
    }
    setLabel(target, label)
    return () => clearLabel(target)
  }, [label, target, setLabel, clearLabel])
}
