"use client"

import { copy } from "@sequel/copy"
import { X } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"
import { Button } from "./button"

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const WIDTH_CLASS = {
  md: "w-[min(520px,100vw)]",
  lg: "w-[min(720px,100vw)]",
  xl: "w-[min(920px,100vw)]",
} as const

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  width?: keyof typeof WIDTH_CLASS
}

export function SheetContent({ className, children, width = "md", ...props }: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border-strong bg-surface text-fg animate-fade-in focus:outline-none",
          WIDTH_CLASS[width],
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export function SheetHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border px-5 py-3.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <SheetPrimitive.Title className="truncate text-md font-semibold">
          {title}
        </SheetPrimitive.Title>
        {description ? (
          <SheetPrimitive.Description className="text-sm text-fg-muted">
            {description}
          </SheetPrimitive.Description>
        ) : (
          <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <SheetPrimitive.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label={copy.actions.close}>
            <X />
          </Button>
        </SheetPrimitive.Close>
      </div>
    </div>
  )
}

export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)} {...props} />
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-5 py-3",
        className,
      )}
      {...props}
    />
  )
}
