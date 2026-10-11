import { cn } from "@/lib/cn"
import { type Tone, toneBarClass } from "@/lib/tones"

type MeterProps = {
  value: number
  max?: number
  tone?: Tone
  className?: string
  label?: string
}

export function Meter({ value, max = 100, tone = "accent", className, label }: MeterProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", toneBarClass[tone])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
