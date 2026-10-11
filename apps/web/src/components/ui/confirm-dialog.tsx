"use client"

import { copy } from "@sequel/copy"
import { AlertDialog } from "radix-ui"
import type { ReactNode } from "react"
import { Button } from "./button"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: ReactNode
  cancelLabel?: ReactNode
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = copy.actions.cancel,
  destructive = false,
  loading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <AlertDialog.Content className="fixed top-[16vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-md border border-border-strong bg-surface animate-fade-in focus:outline-none">
          <div className="flex flex-col gap-1.5 px-5 pt-4 pb-4">
            <AlertDialog.Title className="text-md font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-fg-muted">
              {description ?? copy.states.confirmIrreversible}
            </AlertDialog.Description>
            {children}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2/40 px-5 py-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? "danger" : "primary"}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
