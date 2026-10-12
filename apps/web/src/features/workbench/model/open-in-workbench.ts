"use client"

import { useRouter } from "next/navigation"
import { type MouseEvent, useCallback } from "react"
import { ROUTES } from "@/config/routes"
import { useWorksheetStore } from "./worksheets-store"

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function useOpenInWorkbench() {
  const router = useRouter()
  const open = useCallback(
    (sql: string, title?: string) => {
      useWorksheetStore.getState().createWorksheet({ sql, title })
      router.push(ROUTES.workbench)
    },
    [router],
  )
  const linkHandler = useCallback(
    (sql: string, title?: string) => (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) {
        return
      }
      event.preventDefault()
      open(sql, title)
    },
    [open],
  )
  return { open, linkHandler }
}
