"use client"

import type { SandboxSession } from "@sequel/contracts"
import { copy, interpolate, pluralize, relationKindLabels } from "@sequel/copy"
import { Database, Plus, RotateCcw } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DescriptionList } from "@/components/ui/description-list"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SkeletonRows } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  useEnsureSandboxSession,
  useResetSandboxSession,
  useSandboxSession,
} from "@/features/sandbox/api"
import { formatInteger } from "@/lib/format"
import { sandboxStatusTone } from "../model/preferences"

const sandboxCopy = copy.settings.sandbox
const SKELETON_ROWS = 3

function SessionDetails({ session }: { session: SandboxSession }) {
  const count = session.objects.length
  return (
    <div className="flex flex-col gap-4">
      <DescriptionList
        columns={2}
        items={[
          { label: sandboxCopy.schema, value: session.schemaName, mono: true },
          {
            label: sandboxCopy.status,
            value: (
              <Badge tone={sandboxStatusTone[session.status]} dot>
                {sandboxCopy.statuses[session.status]}
              </Badge>
            ),
          },
          { label: sandboxCopy.created, value: <RelativeTime value={session.createdAt} /> },
          { label: sandboxCopy.lastUsed, value: <RelativeTime value={session.lastUsedAt} /> },
          { label: sandboxCopy.expires, value: <RelativeTime value={session.expiresAt} /> },
        ]}
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-fg-muted">{sandboxCopy.objects}</span>
          <span className="font-mono text-2xs tabular text-fg-subtle">
            {interpolate(pluralize(count, sandboxCopy.objectCount, sandboxCopy.objectCountPlural), {
              count: formatInteger(count),
            })}
          </span>
        </div>
        {count === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-fg-subtle">
            {sandboxCopy.noObjects}
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{sandboxCopy.columns.name}</TableHead>
                  <TableHead>{sandboxCopy.columns.kind}</TableHead>
                  <TableHead className="text-right">{sandboxCopy.columns.rows}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.objects.map((object) => (
                  <TableRow key={object.name}>
                    <TableCell className="max-w-0 truncate font-mono text-xs">
                      {object.name}
                    </TableCell>
                    <TableCell className="text-xs text-fg-muted">
                      {relationKindLabels[object.kind]}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">
                      {formatInteger(object.rowEstimate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

export function SandboxCard() {
  const query = useSandboxSession()
  const ensure = useEnsureSandboxSession()
  const reset = useResetSandboxSession()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const session = query.data?.session ?? null
  const active = session?.status === "active"

  const createWorkspace = () => {
    ensure.mutate(undefined, {
      onSuccess: () => toast.success(sandboxCopy.createSuccess),
      onError: (error) => toast.fromError(error),
    })
  }

  const resetWorkspace = () => {
    reset.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success(sandboxCopy.resetSuccess)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  const createButton = (
    <Button variant="primary" onClick={createWorkspace} loading={ensure.isPending}>
      {ensure.isPending ? null : <Plus />}
      {sandboxCopy.create}
    </Button>
  )

  return (
    <Card>
      <CardHeader
        icon={<Database />}
        title={sandboxCopy.title}
        description={sandboxCopy.description}
        actions={
          session && active ? (
            <Button variant="danger-ghost" size="xs" onClick={() => setConfirmOpen(true)}>
              <RotateCcw />
              {sandboxCopy.reset}
            </Button>
          ) : null
        }
      />
      {query.isPending ? (
        <CardBody>
          <SkeletonRows rows={SKELETON_ROWS} rowClassName="h-9" />
        </CardBody>
      ) : query.isError ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : session ? (
        <CardBody className="flex flex-col gap-4">
          <SessionDetails session={session} />
          {active ? null : <div className="flex justify-end">{createButton}</div>}
        </CardBody>
      ) : (
        <EmptyState
          compact
          icon={Database}
          title={sandboxCopy.emptyTitle}
          description={sandboxCopy.emptyDescription}
          action={createButton}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={sandboxCopy.resetTitle}
        description={interpolate(sandboxCopy.resetDescription, {
          schema: session?.schemaName ?? "",
        })}
        confirmLabel={sandboxCopy.resetConfirm}
        destructive
        loading={reset.isPending}
        onConfirm={resetWorkspace}
      />
    </Card>
  )
}
