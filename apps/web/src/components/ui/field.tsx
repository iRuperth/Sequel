import { copy } from "@sequel/copy"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import { Label } from "./label"

type FieldProps = {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional ? <span className="text-xs text-fg-subtle">{copy.states.optional}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
