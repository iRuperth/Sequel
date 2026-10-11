"use client"

import { useEffect, useState } from "react"

const TICK_MS = 100

export function useElapsed(startedAt: number | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [active])
  if (startedAt === null) {
    return 0
  }
  return Math.max(now - startedAt, 0)
}
