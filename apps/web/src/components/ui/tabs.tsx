"use client"

import { Tabs as TabsPrimitive } from "radix-ui"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/cn"

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  variant = "underline",
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & { variant?: "underline" | "pill" }) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(
        "group/tabs flex shrink-0 items-center",
        variant === "underline"
          ? "gap-1 border-b border-border"
          : "inline-flex h-7 gap-0.5 rounded-md border border-border bg-surface-2 p-0.5",
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  children,
  count,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger> & { count?: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex select-none items-center gap-1.5 whitespace-nowrap text-sm font-medium text-fg-muted transition-colors outline-none hover:text-fg disabled:pointer-events-none disabled:opacity-45 data-[state=active]:text-fg [&_svg]:size-3.5",
        "group-data-[variant=underline]/tabs:h-8 group-data-[variant=underline]/tabs:px-2 group-data-[variant=underline]/tabs:after:absolute group-data-[variant=underline]/tabs:after:inset-x-1.5 group-data-[variant=underline]/tabs:after:-bottom-px group-data-[variant=underline]/tabs:after:h-0.5 group-data-[variant=underline]/tabs:after:rounded-full group-data-[variant=underline]/tabs:data-[state=active]:after:bg-fg",
        "group-data-[variant=pill]/tabs:h-full group-data-[variant=pill]/tabs:rounded-sm group-data-[variant=pill]/tabs:px-2.5 group-data-[variant=pill]/tabs:data-[state=active]:bg-surface-3",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && count !== null ? (
        <span className="rounded-sm bg-surface-2 px-1.5 font-mono text-2xs tabular text-fg-muted group-data-[variant=pill]/tabs:bg-transparent">
          {count}
        </span>
      ) : null}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />
}
