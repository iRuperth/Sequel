"use client"

import { copy } from "@sequel/copy"
import { useSyncExternalStore } from "react"

const MAC_PATTERN = /Mac|iPhone|iPad|iPod/i

function subscribe(): () => void {
  return () => undefined
}

function readIsMac(): boolean {
  return MAC_PATTERN.test(navigator.userAgent)
}

function readServer(): boolean {
  return true
}

export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, readIsMac, readServer)
}

export type KeyName = keyof typeof copy.keys.mac

export function useKeyLabels(): Record<KeyName, string> {
  const isMac = useIsMac()
  return isMac ? copy.keys.mac : copy.keys.other
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
