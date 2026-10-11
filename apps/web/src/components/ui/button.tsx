"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { Slot } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "border border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-surface-3",
        outline: "border border-border bg-transparent text-fg hover:bg-surface-2",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2",
        subtle: "bg-surface-2 text-fg hover:bg-surface-3",
        danger: "bg-danger text-white hover:bg-danger-hover",
        "danger-ghost": "text-danger hover:bg-danger/12",
        link: "h-auto px-0 text-accent-2 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-xs [&_svg]:size-3.5",
        sm: "h-7 px-2.5 text-sm [&_svg]:size-3.5",
        md: "h-8 px-3 text-base [&_svg]:size-4",
        lg: "h-9 px-4 text-base [&_svg]:size-4",
        "icon-xs": "size-6 [&_svg]:size-3.5",
        "icon-sm": "size-7 [&_svg]:size-4",
        icon: "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "sm",
    },
  },
)

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }
  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </button>
  )
}
