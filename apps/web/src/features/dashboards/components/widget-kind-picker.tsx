"use client"

import { WIDGET_KINDS, type WidgetKind } from "@sequel/contracts"
import { widgetKindLabels } from "@sequel/copy"
import { ChartArea, ChartColumn, ChartLine, Hash, type LucideIcon, Table2 } from "lucide-react"
import { RadioGroup } from "radix-ui"

const KIND_ICONS: Record<WidgetKind, LucideIcon> = {
  kpi: Hash,
  line: ChartLine,
  bar: ChartColumn,
  area: ChartArea,
  table: Table2,
}

type WidgetKindPickerProps = {
  value: WidgetKind
  onValueChange: (kind: WidgetKind) => void
  ariaLabel: string
}

export function WidgetKindPicker({ value, onValueChange, ariaLabel }: WidgetKindPickerProps) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => onValueChange(next as WidgetKind)}
      aria-label={ariaLabel}
      orientation="horizontal"
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
    >
      {WIDGET_KINDS.map((kind) => {
        const Icon = KIND_ICONS[kind]
        return (
          <RadioGroup.Item
            key={kind}
            value={kind}
            className="group flex h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-xs font-medium text-fg-muted transition-colors outline-none hover:bg-surface-2 hover:text-fg focus-visible:border-accent-2 data-[state=checked]:border-border-strong data-[state=checked]:bg-accent/15 data-[state=checked]:text-fg"
          >
            <Icon className="size-4 text-fg-subtle group-data-[state=checked]:text-accent-2" />
            {widgetKindLabels[kind]}
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
