"use client"

import type { CellValue as CellValueType } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { cn } from "@/lib/cn"
import { cellDisplay, cellKind } from "../model/cells"
import { CellValue } from "./cell-value"
import { shortTypeName } from "@/lib/sql-templates"

export type GridColumn = {
  name: string
  dataType?: string | null
}

type StaticGridProps = {
  columns: readonly GridColumn[]
  rows: readonly (readonly CellValueType[])[]
  showRowNumbers?: boolean
  showTypes?: boolean
  emptyLabel?: string
  className?: string
  maxHeightClass?: string
  tone?: "default" | "success" | "danger"
}

export function StaticGrid({
  columns,
  rows,
  showRowNumbers = true,
  showTypes = true,
  emptyLabel = copy.results.noRows,
  className,
  maxHeightClass = "max-h-80",
  tone = "default",
}: StaticGridProps) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-md border border-border bg-surface font-mono text-xs",
        maxHeightClass,
        className,
      )}
    >
      <table className="w-max min-w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            {showRowNumbers ? (
              <th className="sticky left-0 z-10 w-10 border-r border-b border-border bg-surface-2 px-2 text-right font-normal text-fg-subtle" />
            ) : null}
            {columns.map((column, index) => (
              <th
                key={`${column.name}-${index}`}
                className={cn(
                  "border-r border-b border-border px-2.5 py-1.5 text-left align-bottom font-medium whitespace-nowrap text-fg last:border-r-0",
                  cellKind(column.dataType) === "number" && "text-right",
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-xs">{column.name}</span>
                  {showTypes && column.dataType ? (
                    <span className="text-2xs font-normal text-fg-subtle">
                      {shortTypeName(column.dataType)}
                    </span>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (showRowNumbers ? 1 : 0)}
                className="px-3 py-6 text-center font-sans text-sm text-fg-muted"
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "hover:bg-surface-2/60",
                  tone === "success" && "bg-success/6",
                  tone === "danger" && "bg-danger/6",
                )}
              >
                {showRowNumbers ? (
                  <td className="sticky left-0 border-r border-b border-border bg-surface px-2 py-1 text-right text-2xs text-fg-subtle tabular">
                    {rowIndex + 1}
                  </td>
                ) : null}
                {columns.map((column, columnIndex) => {
                  const value = row[columnIndex] ?? null
                  return (
                    <td
                      key={columnIndex}
                      title={cellDisplay(value)}
                      className={cn(
                        "max-w-80 truncate border-r border-b border-border px-2.5 py-1 whitespace-nowrap last:border-r-0",
                        cellKind(column.dataType, value) === "number" && "text-right",
                      )}
                    >
                      <CellValue value={value} dataType={column.dataType} />
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
