"use client"

import { LIMITS, type ResultSet, type Row } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { SimpleSelect } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { UI_LIMITS, UI_TIMING } from "@/config/constants"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"
import { downloadCsv } from "@/lib/csv"
import { formatInteger } from "@/lib/format"
import { cellClipboardText, cellDisplay, cellKind, estimateColumnWidth } from "../model/cells"
import { CellValue } from "./cell-value"
import { shortTypeName } from "@/lib/sql-templates"

type ResultGridProps = {
  result: ResultSet
  pageSize: number
  onPageSizeChange?: (size: number) => void
  exportName?: string
  className?: string
}

type ColumnMeta = {
  dataType: string
  numeric: boolean
}

const ROW_NUMBER_MIN_WIDTH = 44
const ROW_NUMBER_DIGIT_WIDTH = 8
const ROW_NUMBER_PADDING = 18
const SAMPLE_ROWS_FOR_WIDTH = 60
const PAGE_SIZES = [...LIMITS.resultPageSizes]

export function ResultGrid({
  result,
  pageSize,
  onPageSizeChange,
  exportName = copy.results.exportFileName,
  className,
}: ResultGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const totalRows = result.rows.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(pageIndex, pageCount - 1)
  const pageStart = safePage * pageSize
  const pageRows = useMemo(
    () => result.rows.slice(pageStart, pageStart + pageSize),
    [result.rows, pageStart, pageSize],
  )

  useEffect(() => {
    if (!copiedKey) {
      return
    }
    const timer = window.setTimeout(() => setCopiedKey(null), UI_TIMING.copiedFeedbackMs)
    return () => window.clearTimeout(timer)
  }, [copiedKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [safePage, pageSize])

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const sample = result.rows.slice(0, SAMPLE_ROWS_FOR_WIDTH)
    return result.columns.map((column, index) => ({
      id: String(index),
      header: column.name,
      accessorFn: (row: Row) => row[index] ?? null,
      size: estimateColumnWidth(
        column.name,
        column.dataType,
        sample.map((row) => row[index] ?? null),
        UI_LIMITS.minResultColumnWidth,
        UI_LIMITS.maxResultColumnWidth,
      ),
      minSize: UI_LIMITS.minResultColumnWidth / 2,
      maxSize: UI_LIMITS.maxResultColumnWidth * 3,
      meta: {
        dataType: column.dataType,
        numeric: cellKind(column.dataType) === "number",
      } satisfies ColumnMeta,
    }))
  }, [result.columns, result.rows])

  const table = useReactTable({
    data: pageRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  })

  const rowVirtualizer = useVirtualizer({
    count: pageRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => UI_LIMITS.resultRowHeight,
    overscan: UI_LIMITS.gridOverscan,
  })

  const lastRowNumber = pageStart + pageRows.length
  const rowNumberWidth = Math.max(
    ROW_NUMBER_MIN_WIDTH,
    String(lastRowNumber).length * ROW_NUMBER_DIGIT_WIDTH + ROW_NUMBER_PADDING,
  )
  const totalWidth = rowNumberWidth + table.getTotalSize()
  const headerGroup = table.getHeaderGroups()[0]

  const onCopy = async (key: string, text: string) => {
    if (await copyToClipboard(text)) {
      setCopiedKey(key)
    }
  }

  const exportCsv = () =>
    downloadCsv(
      exportName,
      result.columns.map((column) => column.name),
      result.rows,
    )

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {result.truncated ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-warning/10 px-3 py-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5 shrink-0" />
          {interpolate(copy.results.truncated, { count: formatInteger(totalRows) })}
        </div>
      ) : null}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto font-mono text-xs">
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          <div
            className="sticky top-0 z-20 flex border-b border-border bg-surface-2"
            style={{ height: UI_LIMITS.resultHeaderHeight, width: totalWidth }}
          >
            <div
              className="sticky left-0 z-10 flex shrink-0 items-end justify-end border-r border-border bg-surface-2 px-2 pb-1.5 text-2xs text-fg-subtle"
              style={{ width: rowNumberWidth }}
            />
            {headerGroup?.headers.map((header) => {
              const meta = header.column.columnDef.meta as ColumnMeta | undefined
              return (
                <div
                  key={header.id}
                  className={cn(
                    "relative flex shrink-0 flex-col justify-end gap-0.5 border-r border-border px-2.5 pb-1.5",
                    meta?.numeric && "items-end text-right",
                  )}
                  style={{ width: header.getSize() }}
                >
                  <span className="max-w-full truncate font-sans text-xs font-medium text-fg">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                  <span className="max-w-full truncate text-2xs text-fg-subtle">
                    {meta?.dataType ? shortTypeName(meta.dataType) : null}
                  </span>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    onDoubleClick={() => header.column.resetSize()}
                    className={cn(
                      "absolute top-0 right-0 z-10 h-full w-1.5 translate-x-1/2 cursor-col-resize select-none touch-none hover:bg-accent-2/50",
                      header.column.getIsResizing() && "bg-accent-2",
                    )}
                  />
                </div>
              )
            })}
          </div>
          <div
            className="relative"
            style={{ height: rowVirtualizer.getTotalSize(), width: totalWidth }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index]
              if (!row) {
                return null
              }
              const rowNumber = pageStart + virtualRow.index + 1
              return (
                <div
                  key={row.id}
                  className="group absolute left-0 flex border-b border-border/70 hover:bg-surface-2/50"
                  style={{
                    height: UI_LIMITS.resultRowHeight,
                    width: totalWidth,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center justify-end border-r border-border bg-surface px-2 text-2xs text-fg-subtle tabular group-hover:bg-surface-2"
                    style={{ width: rowNumberWidth }}
                  >
                    {rowNumber}
                  </div>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                    const value = (cell.getValue() as Row[number]) ?? null
                    const key = `${rowNumber}:${cell.column.id}`
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        title={`${cellDisplay(value)}\n${copy.results.copyCell}`}
                        onClick={() => onCopy(key, cellClipboardText(value))}
                        className={cn(
                          "flex shrink-0 items-center overflow-hidden border-r border-border/70 px-2.5 text-left text-fg outline-none focus-visible:bg-accent/15",
                          meta?.numeric && "justify-end",
                          copiedKey === key && "bg-accent/20",
                        )}
                        style={{ width: cell.column.getSize() }}
                      >
                        <CellValue value={value} dataType={meta?.dataType} className="truncate" />
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 text-xs text-fg-muted">
        <div className="flex min-w-0 items-center gap-3">
          <span className="tabular">
            {interpolate(copy.results.pagination.range, {
              from: formatInteger(totalRows === 0 ? 0 : pageStart + 1),
              to: formatInteger(lastRowNumber),
              total: formatInteger(totalRows),
            })}
          </span>
          <span className="text-fg-subtle">
            {interpolate(copy.results.columnsCount, { count: result.columns.length })}
          </span>
          {copiedKey ? (
            <span className="flex items-center gap-1 text-success">
              <Check className="size-3" />
              {copy.results.cellCopied}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {onPageSizeChange ? (
            <div className="flex items-center gap-1.5">
              <span className="text-fg-subtle">{copy.results.pagination.rowsPerPage}</span>
              <SimpleSelect
                size="xs"
                className="w-[72px]"
                value={String(pageSize)}
                ariaLabel={copy.results.pagination.rowsPerPage}
                onValueChange={(next) => {
                  setPageIndex(0)
                  onPageSizeChange(Number(next))
                }}
                options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
              />
            </div>
          ) : null}
          <div
            className="flex items-center"
            role="navigation"
            aria-label={copy.results.pagination.label}
          >
            <Tooltip content={copy.results.pagination.first}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.results.pagination.first}
                disabled={safePage === 0}
                onClick={() => setPageIndex(0)}
              >
                <ChevronsLeft />
              </Button>
            </Tooltip>
            <Tooltip content={copy.results.pagination.previous}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.results.pagination.previous}
                disabled={safePage === 0}
                onClick={() => setPageIndex(safePage - 1)}
              >
                <ChevronLeft />
              </Button>
            </Tooltip>
            <span className="px-1.5 tabular">
              {interpolate(copy.results.pagination.page, {
                page: formatInteger(safePage + 1),
                pages: formatInteger(pageCount),
              })}
            </span>
            <Tooltip content={copy.results.pagination.next}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.results.pagination.next}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPageIndex(safePage + 1)}
              >
                <ChevronRight />
              </Button>
            </Tooltip>
            <Tooltip content={copy.results.pagination.last}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.results.pagination.last}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPageIndex(pageCount - 1)}
              >
                <ChevronsRight />
              </Button>
            </Tooltip>
          </div>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="xs" onClick={exportCsv} disabled={totalRows === 0}>
            <Download />
            {copy.results.exportCsv}
          </Button>
        </div>
      </div>
    </div>
  )
}
