import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/cn"

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-4 animate-spin text-fg-muted", className)} aria-hidden />
}

export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-0.5 w-full overflow-hidden bg-surface-2", className)}>
      <div className="absolute inset-y-0 left-0 w-1/3 animate-indeterminate bg-accent-2" />
    </div>
  )
}
