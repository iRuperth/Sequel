import { cn } from "@/lib/cn"
import { type Tone, toneDotClass } from "@/lib/tones"

export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: Tone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        toneDotClass[tone],
        pulse && "animate-pulse-soft",
        className,
      )}
    />
  )
}
