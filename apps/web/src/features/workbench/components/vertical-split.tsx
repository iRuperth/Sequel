"use client"

import { copy } from "@sequel/copy"
import { type KeyboardEvent, type PointerEvent, type ReactNode, useRef } from "react"
import { cn } from "@/lib/cn"

const KEYBOARD_STEP = 0.04

type VerticalSplitProps = {
  top: ReactNode
  bottom: ReactNode
  ratio: number
  onRatioChange: (ratio: number) => void
}

export function VerticalSplit({ top, bottom, ratio, onRatioChange }: VerticalSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) {
      return
    }
    event.preventDefault()
    draggingRef.current = true
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"
    const rect = container.getBoundingClientRect()
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (!draggingRef.current) {
        return
      }
      onRatioChange((rect.bottom - moveEvent.clientY) / rect.height)
    }
    const onUp = () => {
      draggingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      target.removeEventListener("pointermove", onMove)
      target.removeEventListener("pointerup", onUp)
      target.removeEventListener("pointercancel", onUp)
    }
    target.addEventListener("pointermove", onMove)
    target.addEventListener("pointerup", onUp)
    target.addEventListener("pointercancel", onUp)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault()
      onRatioChange(ratio + KEYBOARD_STEP)
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      onRatioChange(ratio - KEYBOARD_STEP)
    }
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">{top}</div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={copy.workbench.panel.resize}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={cn(
          "group relative z-10 h-px shrink-0 cursor-row-resize bg-border outline-none",
          "focus-visible:bg-accent-2",
        )}
      >
        <div className="absolute inset-x-0 -top-1 h-2.5 transition-colors group-hover:bg-accent-2/40" />
      </div>
      <div className="flex min-h-0 shrink-0 flex-col" style={{ height: `${ratio * 100}%` }}>
        {bottom}
      </div>
    </div>
  )
}
