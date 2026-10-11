"use client"

import { type Dashboard, type DashboardSummary, LIMITS } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { type FormEvent, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useCreateDashboard, useUpdateDashboard } from "../api"

type DashboardFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboard?: DashboardSummary | null
  onCreated?: (dashboard: Dashboard) => void
}

export function DashboardFormDialog({
  open,
  onOpenChange,
  dashboard,
  onCreated,
}: DashboardFormDialogProps) {
  const editing = Boolean(dashboard)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader
          title={editing ? copy.dashboards.form.editTitle : copy.dashboards.form.createTitle}
          description={
            editing ? copy.dashboards.form.editDescription : copy.dashboards.form.createDescription
          }
        />
        {dashboard ? (
          <EditDashboardForm dashboard={dashboard} onDone={() => onOpenChange(false)} />
        ) : (
          <CreateDashboardForm
            onDone={(created) => {
              onOpenChange(false)
              onCreated?.(created)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type FormValues = { name: string; description: string }

function DashboardFields({
  values,
  onChange,
  showErrors,
}: {
  values: FormValues
  onChange: (values: FormValues) => void
  showErrors: boolean
}) {
  const nameId = useId()
  const descriptionId = useId()
  const nameError = showErrors && !values.name.trim() ? copy.dashboards.form.nameRequired : null
  return (
    <DialogBody className="flex flex-col gap-4">
      <Field label={copy.dashboards.form.name} htmlFor={nameId} error={nameError}>
        <Input
          id={nameId}
          autoFocus
          value={values.name}
          maxLength={LIMITS.nameMaxLength}
          placeholder={copy.dashboards.form.namePlaceholder}
          aria-invalid={nameError ? true : undefined}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
      </Field>
      <Field label={copy.dashboards.form.descriptionLabel} htmlFor={descriptionId} optional>
        <Textarea
          id={descriptionId}
          value={values.description}
          maxLength={LIMITS.descriptionMaxLength}
          placeholder={copy.dashboards.form.descriptionPlaceholder}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </Field>
    </DialogBody>
  )
}

function FormFooter({ pending, submitLabel }: { pending: boolean; submitLabel: string }) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost" disabled={pending}>
          {copy.actions.cancel}
        </Button>
      </DialogClose>
      <Button type="submit" variant="primary" loading={pending}>
        {submitLabel}
      </Button>
    </DialogFooter>
  )
}

function CreateDashboardForm({ onDone }: { onDone: (dashboard: Dashboard) => void }) {
  const [values, setValues] = useState<FormValues>({ name: "", description: "" })
  const [showErrors, setShowErrors] = useState(false)
  const create = useCreateDashboard()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    const name = values.name.trim()
    if (!name) {
      return
    }
    create.mutate(
      { name, description: values.description.trim() || null },
      {
        onSuccess: (dashboard) => {
          toast.success(copy.dashboards.form.created)
          onDone(dashboard)
        },
        onError: (error) => toast.fromError(error),
      },
    )
  }
  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DashboardFields values={values} onChange={setValues} showErrors={showErrors} />
      <FormFooter pending={create.isPending} submitLabel={copy.dashboards.form.submitCreate} />
    </form>
  )
}

function EditDashboardForm({
  dashboard,
  onDone,
}: {
  dashboard: DashboardSummary
  onDone: () => void
}) {
  const [values, setValues] = useState<FormValues>({
    name: dashboard.name,
    description: dashboard.description ?? "",
  })
  const [showErrors, setShowErrors] = useState(false)
  const update = useUpdateDashboard(dashboard.id)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    const name = values.name.trim()
    if (!name) {
      return
    }
    update.mutate(
      { name, description: values.description.trim() || null },
      {
        onSuccess: () => {
          toast.success(copy.dashboards.form.updated)
          onDone()
        },
        onError: (error) => toast.fromError(error),
      },
    )
  }
  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DashboardFields values={values} onChange={setValues} showErrors={showErrors} />
      <FormFooter pending={update.isPending} submitLabel={copy.dashboards.form.submitUpdate} />
    </form>
  )
}
