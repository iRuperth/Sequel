"use client"

import { useEffect, useRef } from "react"

export type Hotkey = {
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey): boolean {
  const mod = event.metaKey || event.ctrlKey
  return (
    event.key.toLowerCase() === hotkey.key.toLowerCase() &&
    mod === Boolean(hotkey.mod) &&
    event.shiftKey === Boolean(hotkey.shift) &&
    event.altKey === Boolean(hotkey.alt)
  )
}

export function useHotkey(
  hotkey: Hotkey,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])
  const { key, mod, shift, alt } = hotkey
  useEffect(() => {
    if (!enabled) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }
      if (matchesHotkey(event, { key, mod, shift, alt })) {
        event.preventDefault()
        handlerRef.current(event)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [key, mod, shift, alt, enabled])
}
