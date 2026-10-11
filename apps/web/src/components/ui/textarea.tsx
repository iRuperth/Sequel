import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { fieldControlClass } from "./input"

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldControlClass, "min-h-20 resize-y px-2.5 py-1.5 text-base", className)}
      {...props}
    />
  )
}
