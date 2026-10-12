"use client"

import { useEffect, useRef, useState } from "react"
import { UI_TIMING } from "@/config/constants"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { saveTaskDraft, useSaveDraft } from "../api"

export type DraftState = "idle" | "dirty" | "saving" | "saved" | "error"

type SavePhase = "idle" | "saving" | "saved" | "error"

export function useDraftAutosave(
  taskId: string,
  sql: string,
  initialSql: string,
  onSaved?: () => void,
) {
  const { mutate } = useSaveDraft(taskId)
  const debounced = useDebouncedValue(sql, UI_TIMING.draftAutosaveMs)
  const [savedSql, setSavedSql] = useState(initialSql)
  const [phase, setPhase] = useState<SavePhase>("idle")
  const latestRef = useRef({ sql, savedSql, taskId })
  const onSavedRef = useRef(onSaved)

  useEffect(() => {
    latestRef.current = { sql, savedSql, taskId }
    onSavedRef.current = onSaved
  })

  useEffect(() => {
    if (debounced === savedSql) {
      return
    }
    const value = debounced
    setPhase("saving")
    mutate(value, {
      onSuccess: () => {
        setSavedSql(value)
        setPhase("saved")
        onSavedRef.current?.()
      },
      onError: () => setPhase("error"),
    })
  }, [debounced, savedSql, mutate])

  useEffect(() => {
    const tracker = latestRef
    return () => {
      const latest = tracker.current
      if (latest.sql !== latest.savedSql) {
        void saveTaskDraft(latest.taskId, latest.sql).catch(() => undefined)
      }
    }
  }, [])

  const markSaved = (value: string) => {
    setSavedSql(value)
    setPhase("saved")
  }

  return { state: draftState(phase, sql !== savedSql), markSaved }
}

function draftState(phase: SavePhase, dirty: boolean): DraftState {
  if (phase === "saving") {
    return "saving"
  }
  if (dirty) {
    return phase === "error" ? "error" : "dirty"
  }
  return phase === "error" ? "idle" : phase
}
