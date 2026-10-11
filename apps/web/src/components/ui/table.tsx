import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function TableContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full overflow-auto rounded-md border border-border bg-surface", className)}
      {...props}
    />
  )
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("sticky top-0 z-10 bg-surface-2", className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&>tr:last-child>td]:border-b-0", className)} {...props} />
}

export function TableRow({
  className,
  interactive,
  selected,
  ...props
}: ComponentProps<"tr"> & { interactive?: boolean; selected?: boolean }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "transition-colors data-[selected]:bg-accent/10",
        interactive && "cursor-pointer hover:bg-surface-2/70",
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-8 border-b border-border px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-fg-muted",
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("h-9 border-b border-border px-3 align-middle text-fg", className)}
      {...props}
    />
  )
}
