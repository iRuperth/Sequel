"use client"

import { copy } from "@sequel/copy"
import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import { useEffect } from "react"
import { create } from "zustand"
import { UI_TIMING } from "@/config/constants"
import { describeError } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { createId } from "@/lib/ids"

type ToastTone = "success" | "error" | "info"

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  description?: string | null
}

type ToastStore = {
  items: ToastItem[]
  push: (item: Omit<ToastItem, "id">) => void
  dismiss: (id: string) => void
}

const MAX_VISIBLE = 4

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (item) =>
    set((state) => ({ items: [...state.items, { ...item, id: createId() }].slice(-MAX_VISIBLE) })),
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}))

export const toast = {
  success: (title: string, description?: string | null) =>
    useToastStore.getState().push({ tone: "success", title, description }),
  info: (title: string, description?: string | null) =>
    useToastStore.getState().push({ tone: "info", title, description }),
  error: (title: string, description?: string | null) =>
    useToastStore.getState().push({ tone: "error", title, description }),
  fromError: (error: unknown, title: string = copy.states.actionFailed) => {
    const described = describeError(error)
    useToastStore.getState().push({
      tone: "error",
      title,
      description: described.detail
        ? `${described.message} ${described.detail}`
        : described.message,
    })
  },
}

const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const

const TONE_CLASS = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent-2",
} as const

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss)
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), UI_TIMING.toastDurationMs)
    return () => window.clearTimeout(timer)
  }, [dismiss, item.id])
  const Icon = TONE_ICON[item.tone]
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-[360px] items-start gap-2.5 rounded-md border border-border-strong bg-surface-2 px-3 py-2.5 animate-fade-in"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_CLASS[item.tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium text-fg">{item.title}</p>
        {item.description ? (
          <p className="text-xs break-words text-fg-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label={copy.actions.close}
        className="rounded-sm p-0.5 text-fg-subtle hover:bg-surface-3 hover:text-fg"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const items = useToastStore((state) => state.items)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
