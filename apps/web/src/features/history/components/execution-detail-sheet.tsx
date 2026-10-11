"use client"

import type { ExecutionDetail } from "@sequel/contracts"
import {
  copy,
  executionModeLabels,
  executionSourceLabels,
  executionStatusLabels,
  interpolate,
  rejectionReasonLabels,
} from "@sequel/copy"
import { SquareTerminal, TriangleAlert } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { DescriptionList } from "@/components/ui/description-list"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/sheet"
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton"
import { SqlCode } from "@/components/ui/sql-code"
import { routeTo } from "@/config/routes"
import { EMPTY_VALUE, formatDate, formatDuration, formatInteger } from "@/lib/format"
import { executionStatusTone } from "@/lib/tones"
import { useExecutionDetail } from "../api"
import { HISTORY_SKELETON } from "../model/constants"
import { useOpenInWorkbench } from "@/features/workbench/model/open-in-workbench"

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{title}</h3>
      {children}
    </section>
  )
}

function ExecutionError({ detail }: { detail: ExecutionDetail }) {
  if (!detail.errorMessage && !detail.rejectionReason) {
    return null
  }
  return (
    <div className="flex flex-col gap-2 rounded-md bg-danger/10 px-3.5 py-3">
      <div className="flex items-start gap-2 text-danger">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-medium">{copy.history.detail.error}</span>
          {detail.errorMessage ? (
            <span className="font-mono text-xs break-words text-fg">{detail.errorMessage}</span>
          ) : null}
        </div>
      </div>
      <DescriptionList
        className="pl-5.5"
        items={[
          ...(detail.errorDetail
            ? [{ label: copy.history.detail.errorDetail, value: detail.errorDetail, mono: true }]
            : []),
          ...(detail.errorPosition !== null
            ? [
                {
                  label: copy.history.detail.errorPosition,
                  value: interpolate(copy.history.detail.errorPositionValue, {
                    position: formatInteger(detail.errorPosition),
                  }),
                },
              ]
            : []),
          ...(detail.rejectionReason
            ? [
                {
                  label: copy.history.detail.rejection,
                  value: rejectionReasonLabels[detail.rejectionReason],
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}

function ResultColumns({ detail }: { detail: ExecutionDetail }) {
  const columns = detail.columns ?? []
  if (columns.length === 0) {
    return <p className="text-sm text-fg-subtle">{copy.history.detail.noColumns}</p>
  }
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-2">
          <tr>
            <th className="h-7 border-b border-border px-3 text-left text-xs font-medium text-fg-muted">
              {copy.history.detail.columnName}
            </th>
            <th className="h-7 border-b border-border px-3 text-left text-xs font-medium text-fg-muted">
              {copy.history.detail.columnType}
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column, index) => (
            <tr key={`${column.name}-${index}`} className="border-b border-border last:border-b-0">
              <td className="h-7 px-3 font-mono text-xs text-fg">{column.name}</td>
              <td className="h-7 px-3 font-mono text-xs text-fg-muted">{column.dataType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailBody({ detail }: { detail: ExecutionDetail }) {
  const columns = detail.columns ?? []
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={executionStatusTone[detail.status]} dot>
          {executionStatusLabels[detail.status]}
        </Badge>
        <Badge variant="outline">{executionSourceLabels[detail.source]}</Badge>
        <Badge variant="outline">{executionModeLabels[detail.mode]}</Badge>
      </div>
      <DetailSection title={copy.history.detail.sql}>
        <div className="rounded-md border border-border bg-surface-2/40">
          <SqlCode sql={detail.sqlText} wrap className="max-h-80 px-3.5 py-3" />
        </div>
      </DetailSection>
      <ExecutionError detail={detail} />
      <DetailSection title={copy.history.detail.timing}>
        <DescriptionList
          columns={3}
          items={[
            {
              label: copy.history.detail.duration,
              value: formatDuration(detail.durationMs),
              mono: true,
            },
            {
              label: copy.history.detail.executedAt,
              value: formatDate(detail.executedAt, "dateTimeSeconds"),
            },
            {
              label: copy.history.detail.executedAgo,
              value: <RelativeTime value={detail.executedAt} />,
            },
          ]}
        />
      </DetailSection>
      <DetailSection title={copy.history.detail.output}>
        <DescriptionList
          columns={3}
          items={[
            {
              label: copy.history.detail.rows,
              value: detail.rowCount === null ? EMPTY_VALUE : formatInteger(detail.rowCount),
              mono: true,
            },
            {
              label: copy.history.detail.truncated,
              value: detail.truncated ? (
                <Badge tone="warning">{copy.common.yes}</Badge>
              ) : (
                copy.common.no
              ),
            },
            {
              label: copy.history.detail.statements,
              value: formatInteger(detail.statementCount),
              mono: true,
            },
            ...(detail.taskId
              ? [
                  {
                    label: copy.history.detail.task,
                    value: (
                      <Link
                        href={routeTo.task(detail.taskId)}
                        className="text-accent-2 hover:underline"
                      >
                        {copy.history.detail.openTask}
                      </Link>
                    ),
                  },
                ]
              : []),
            {
              label: copy.history.detail.executionId,
              value: <span className="break-all">{detail.id}</span>,
              mono: true,
            },
          ]}
        />
      </DetailSection>
      <DetailSection
        title={
          columns.length > 0
            ? interpolate(copy.history.detail.resultColumnsCount, {
                count: formatInteger(columns.length),
              })
            : copy.history.detail.resultColumns
        }
      >
        <ResultColumns detail={detail} />
      </DetailSection>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-28 w-full" />
      <SkeletonRows rows={HISTORY_SKELETON.detailRows} />
    </div>
  )
}

type ExecutionDetailSheetProps = {
  executionId: string | null
  onClose: () => void
}

export function ExecutionDetailSheet({ executionId, onClose }: ExecutionDetailSheetProps) {
  const { linkHandler } = useOpenInWorkbench()
  const query = useExecutionDetail(executionId)
  const detail = query.data
  return (
    <Sheet open={executionId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent width="lg">
        <SheetHeader
          title={copy.history.detail.title}
          description={
            detail ? (
              <span className="inline-flex items-center gap-1.5">
                <span>{executionSourceLabels[detail.source]}</span>
                <span aria-hidden className="size-1 rounded-full bg-fg-subtle" />
                <RelativeTime value={detail.executedAt} />
              </span>
            ) : undefined
          }
          actions={
            detail ? (
              <CopyButton value={detail.sqlText} label={copy.history.detail.copySql} />
            ) : null
          }
        />
        <SheetBody>
          {query.isPending ? (
            <DetailSkeleton />
          ) : query.isError ? (
            <ErrorState
              compact
              error={query.error}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : (
            <DetailBody detail={query.data} />
          )}
        </SheetBody>
        {detail ? (
          <SheetFooter>
            <CopyButton
              value={detail.sqlText}
              label={copy.history.detail.copySql}
              showLabel
              variant="secondary"
              className="h-7 px-2.5 text-sm"
            />
            <Button variant="primary" asChild>
              <Link
                href={routeTo.workbenchWithSql(detail.sqlText)}
                onClick={linkHandler(detail.sqlText)}
              >
                <SquareTerminal />
                {copy.actions.openInWorkbench}
              </Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
