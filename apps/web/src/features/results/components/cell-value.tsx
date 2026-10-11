import type { CellValue as CellValueType } from "@sequel/contracts"
import { cn } from "@/lib/cn"
import { cellDisplay, cellKind } from "../model/cells"

export function CellValue({
  value,
  dataType,
  className,
}: {
  value: CellValueType
  dataType?: string | null
  className?: string
}) {
  if (value === null) {
    return <span className={cn("text-fg-subtle italic", className)}>{cellDisplay(value)}</span>
  }
  const kind = cellKind(dataType, value)
  return (
    <span
      className={cn(
        "truncate",
        kind === "number" && "tabular",
        kind === "boolean" && "text-accent-2",
        className,
      )}
    >
      {cellDisplay(value)}
    </span>
  )
}
