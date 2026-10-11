"use client"

import { useEffect } from "react"
import { useWorksheetStore } from "@/features/workbench/model/worksheets-store"
import { useLayoutStore } from "./layout-store"

export function StoreHydrator() {
  useEffect(() => {
    void useLayoutStore.persist.rehydrate()
    void useWorksheetStore.persist.rehydrate()
  }, [])
  return null
}
