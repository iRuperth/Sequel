"use client"

import type { ExecutionSummary } from "@sequel/contracts"
import {
  copy,
  executionModeLabels,
  executionSourceLabels,
  executionStatusLabels,
} from "@sequel/copy"
import type { KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { EMPTY_VALUE, formatDuration, formatInteger } from "@/lib/format"
import { executionStatusTone } from "@/lib/tones"
import { sqlPreview } from "../model/sql-preview"

function RowCount({ execution }: { execution: ExecutionSummary }) {
  if (execution.rowCount === null) {
    return <span className="text-fg-subtle">{EMPTY_VALUE}</span>
  }
  return (
    <span className="inline-flex items-center justify-end gap-0.5">
      {formatInteger(execution.rowCount)}
      {execution.truncated ? (
        <Tooltip content={copy.history.truncatedTooltip}>
          <span tabIndex={0} className="cursor-help text-warning">
            {copy.history.truncatedMarker}
          </span>
        </Tooltip>
      ) : null}
    </span>
  )
}

type HistoryTableProps = {
  items: readonly ExecutionSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function HistoryTable({ items, selectedId, onSelect }: HistoryTableProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.target !== event.currentTarget) {
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(id)
    }
  }
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">{copy.history.columns.status}</TableHead>
            <TableHead>{copy.history.columns.sql}</TableHead>
            <TableHead>{copy.history.columns.source}</TableHead>
            <TableHead>{copy.history.columns.mode}</TableHead>
            <TableHead className="text-right">{copy.history.columns.duration}</TableHead>
            <TableHead className="text-right">{copy.history.columns.rows}</TableHead>
            <TableHead>{copy.history.columns.executed}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((execution) => {
            const preview = sqlPreview(execution.sqlText)
            return (
              <TableRow
                key={execution.id}
                interactive
                tabIndex={0}
                selected={execution.id === selectedId}
                onClick={() => onSelect(execution.id)}
                onKeyDown={(event) => onKeyDown(event, execution.id)}
                className="outline-none focus-visible:bg-surface-2"
              >
                <TableCell className="whitespace-nowrap">
                  <Badge tone={executionStatusTone[execution.status]} dot>
                    {executionStatusLabels[execution.status]}
                  </Badge>
                </TableCell>
                <TableCell className="w-full max-w-0">
                  <div className="truncate font-mono text-xs text-fg" title={execution.sqlText}>
                    {preview || (
                      <span className="font-sans text-fg-subtle">{copy.history.emptySql}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {executionSourceLabels[execution.source]}
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {executionModeLabels[execution.mode]}
                </TableCell>
                <TableCell className="text-right font-mono text-xs whitespace-nowrap tabular">
                  {formatDuration(execution.durationMs)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs whitespace-nowrap tabular">
                  <RowCount execution={execution} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  <RelativeTime value={execution.executedAt} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
