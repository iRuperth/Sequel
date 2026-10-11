"use client"

import { ChevronRight } from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export const Accordion = AccordionPrimitive.Root

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  )
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center gap-2 py-2.5 text-left text-sm font-medium text-fg outline-none hover:text-fg disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        <ChevronRight className="size-3.5 shrink-0 text-fg-muted transition-transform group-data-[state=open]:rotate-90" />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden text-sm" {...props}>
      <div className={cn("pb-3 pl-5.5 text-fg-muted", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}
