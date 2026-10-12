"use client"

import type { QualityCheck } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { toast } from "@/components/ui/toast"
import { useDeleteQualityCheck } from "../api"
import { CheckFormDialog } from "./check-form-dialog"
import { CheckRunsSheet } from "./check-runs-sheet"
import { ChecksTable } from "./checks-table"
import { QualityOverview } from "./quality-overview"

type TargetState = { open: boolean; check: QualityCheck | null }

const CLOSED: TargetState = { open: false, check: null }

export function QualityView() {
  const [formTarget, setFormTarget] = useState<TargetState>(CLOSED)
  const [runsTarget, setRunsTarget] = useState<TargetState>(CLOSED)
  const [deleteTarget, setDeleteTarget] = useState<QualityCheck | null>(null)
  const remove = useDeleteQualityCheck()
  const openCreate = () => setFormTarget({ open: true, check: null })

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(copy.quality.deleted)
        setDeleteTarget(null)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title={copy.quality.title}
        description={copy.quality.description}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus />
            {copy.quality.newCheck}
          </Button>
        }
      />
      <QualityOverview />
      <ChecksTable
        onCreate={openCreate}
        onEdit={(check) => setFormTarget({ open: true, check })}
        onViewRuns={(check) => setRunsTarget({ open: true, check })}
        onDelete={setDeleteTarget}
      />
      <CheckFormDialog
        open={formTarget.open}
        onOpenChange={(open) => setFormTarget((current) => ({ ...current, open }))}
        check={formTarget.check}
      />
      <CheckRunsSheet
        open={runsTarget.open}
        onOpenChange={(open) => setRunsTarget((current) => ({ ...current, open }))}
        check={runsTarget.check}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title={interpolate(copy.quality.deleteTitle, { name: deleteTarget?.name ?? "" })}
        description={copy.quality.deleteDescription}
        confirmLabel={copy.actions.delete}
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  )
}
