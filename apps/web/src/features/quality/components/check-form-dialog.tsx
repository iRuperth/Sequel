"use client"

import {
  LIMITS,
  QUALITY_CHECK_KINDS,
  type QualityCheck,
  type QualityCheckKind,
  SEVERITIES,
  type Severity,
} from "@sequel/contracts"
import { copy, qualityCheckKindLabels, severityLabels } from "@sequel/copy"
import { type FormEvent, type ReactNode, useId, useMemo, useState } from "react"
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
import { SimpleSelect, type SimpleSelectOption } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { CRON_PRESETS, normalizeCron } from "@/features/jobs/model/cron-presets"
import { useSchemaTree } from "@/features/schema-browser/api"
import { cn } from "@/lib/cn"
import { useCreateQualityCheck, useUpdateQualityCheck } from "../api"
import {
  type CheckFormState,
  describeExpectation,
  initialCheckForm,
  requiresColumn,
  toCheckRequest,
  validateCheckForm,
} from "../model/check-form"
import { NO_COLUMN, QUALITY_CRON_PRESETS } from "../model/constants"

const t = copy.quality.form

type CheckFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  check: QualityCheck | null
}

export function CheckFormDialog({ open, onOpenChange, check }: CheckFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader title={check ? t.editTitle : t.createTitle} description={t.description} />
        <CheckForm key={check?.id ?? "new"} check={check} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

const KIND_OPTIONS: SimpleSelectOption<QualityCheckKind>[] = QUALITY_CHECK_KINDS.map((kind) => ({
  value: kind,
  label: qualityCheckKindLabels[kind],
}))

const SEVERITY_OPTIONS: SimpleSelectOption<Severity>[] = SEVERITIES.map((severity) => ({
  value: severity,
  label: severityLabels[severity],
}))

function withCurrent(options: SimpleSelectOption<string>[], current: string) {
  if (current && !options.some((option) => option.value === current)) {
    return [{ value: current, label: current }, ...options]
  }
  return options
}

function CheckForm({ check, onDone }: { check: QualityCheck | null; onDone: () => void }) {
  const ids = {
    name: useId(),
    description: useId(),
    kind: useId(),
    schema: useId(),
    table: useId(),
    column: useId(),
    min: useId(),
    max: useId(),
    maxAge: useId(),
    values: useId(),
    sql: useId(),
    severity: useId(),
    enabled: useId(),
    cron: useId(),
  }
  const [form, setForm] = useState<CheckFormState>(() => initialCheckForm(check))
  const [showErrors, setShowErrors] = useState(false)
  const create = useCreateQualityCheck()
  const update = useUpdateQualityCheck()
  const pending = create.isPending || update.isPending
  const tree = useSchemaTree()
  const errors = showErrors ? validateCheckForm(form) : {}
  const patch = (next: Partial<CheckFormState>) => setForm((current) => ({ ...current, ...next }))
  const columnRequired = requiresColumn(form.kind)

  const datasetSchemas = useMemo(
    () => (tree.data?.schemas ?? []).filter((schema) => schema.kind === "dataset"),
    [tree.data],
  )
  const selectedSchema = datasetSchemas.find((schema) => schema.name === form.targetSchema)
  const selectedTable = selectedSchema?.tables.find((table) => table.name === form.targetTable)

  const schemaOptions = withCurrent(
    datasetSchemas.map((schema) => ({
      value: schema.name,
      label: (
        <span className="flex items-baseline gap-2">
          <span className="font-mono">{schema.name}</span>
          {schema.label !== schema.name ? (
            <span className="text-2xs text-fg-subtle">{schema.label}</span>
          ) : null}
        </span>
      ),
    })),
    form.targetSchema,
  )
  const tableOptions = withCurrent(
    (selectedSchema?.tables ?? []).map((table) => ({
      value: table.name,
      label: <span className="font-mono">{table.name}</span>,
    })),
    form.targetTable,
  )
  const columnOptions: SimpleSelectOption<string>[] = [
    ...(columnRequired ? [] : [{ value: NO_COLUMN, label: t.noColumn }]),
    ...withCurrent(
      (selectedTable?.columns ?? []).map((column) => ({
        value: column.name,
        label: (
          <span className="flex items-baseline gap-2">
            <span className="font-mono">{column.name}</span>
            <span className="text-2xs text-fg-subtle">{column.dataType}</span>
          </span>
        ),
      })),
      form.targetColumn,
    ),
  ]

  const changeKind = (kind: QualityCheckKind) => patch({ kind })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (Object.keys(validateCheckForm(form)).length > 0) {
      return
    }
    const body = toCheckRequest(form)
    const options = {
      onSuccess: () => {
        toast.success(check ? t.updated : t.created)
        onDone()
      },
      onError: (error: unknown) => toast.fromError(error),
    }
    if (check) {
      update.mutate({ id: check.id, body }, options)
    } else {
      create.mutate(body, options)
    }
  }

  const freeText = tree.isError
  const cronValue = normalizeCron(form.cronExpression)
  const columnLabel = form.kind === "freshness" ? t.timestampColumn : t.targetColumn
  const expectation = describeExpectation(form)

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.name} htmlFor={ids.name} error={errors.name}>
            <Input
              id={ids.name}
              autoFocus
              value={form.name}
              maxLength={LIMITS.nameMaxLength}
              placeholder={t.namePlaceholder}
              aria-invalid={errors.name ? true : undefined}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Field>
          <Field label={t.kind} htmlFor={ids.kind} hint={t.kindHints[form.kind]}>
            <SimpleSelect
              id={ids.kind}
              value={form.kind}
              onValueChange={changeKind}
              options={KIND_OPTIONS}
            />
          </Field>
        </div>
        <Field label={t.descriptionLabel} htmlFor={ids.description} optional>
          <Textarea
            id={ids.description}
            className="min-h-14"
            value={form.description}
            maxLength={LIMITS.descriptionMaxLength}
            placeholder={t.descriptionPlaceholder}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>

        <FormSection title={t.target}>
          {tree.isPending ? (
            <p className="inline-flex items-center gap-2 text-sm text-fg-muted">
              <Spinner className="size-3.5" />
              {t.schemaLoading}
            </p>
          ) : freeText ? (
            <p className="text-xs text-warning">{t.schemaUnavailable}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.targetSchema} htmlFor={ids.schema} error={errors.target}>
              {freeText ? (
                <Input
                  id={ids.schema}
                  className="font-mono"
                  value={form.targetSchema}
                  aria-invalid={errors.target ? true : undefined}
                  onChange={(event) => patch({ targetSchema: event.target.value })}
                />
              ) : (
                <SimpleSelect
                  id={ids.schema}
                  value={form.targetSchema || undefined}
                  onValueChange={(targetSchema) =>
                    patch({ targetSchema, targetTable: "", targetColumn: "" })
                  }
                  options={schemaOptions}
                  disabled={tree.isPending}
                  placeholder={t.schemaPlaceholder}
                />
              )}
            </Field>
            <Field label={t.targetTable} htmlFor={ids.table}>
              {freeText ? (
                <Input
                  id={ids.table}
                  className="font-mono"
                  value={form.targetTable}
                  aria-invalid={errors.target ? true : undefined}
                  onChange={(event) => patch({ targetTable: event.target.value })}
                />
              ) : (
                <SimpleSelect
                  id={ids.table}
                  value={form.targetTable || undefined}
                  onValueChange={(targetTable) => patch({ targetTable, targetColumn: "" })}
                  options={tableOptions}
                  disabled={tree.isPending || !form.targetSchema}
                  placeholder={t.tablePlaceholder}
                />
              )}
            </Field>
            <Field
              label={columnLabel}
              htmlFor={ids.column}
              optional={!columnRequired}
              error={errors.targetColumn}
            >
              {freeText ? (
                <Input
                  id={ids.column}
                  className="font-mono"
                  value={form.targetColumn}
                  aria-invalid={errors.targetColumn ? true : undefined}
                  onChange={(event) => patch({ targetColumn: event.target.value })}
                />
              ) : (
                <SimpleSelect
                  id={ids.column}
                  value={form.targetColumn || (columnRequired ? undefined : NO_COLUMN)}
                  onValueChange={(value) =>
                    patch({ targetColumn: value === NO_COLUMN ? "" : value })
                  }
                  options={columnOptions}
                  disabled={tree.isPending || !form.targetTable}
                  placeholder={t.columnPlaceholder}
                />
              )}
            </Field>
          </div>
        </FormSection>

        <KindFields form={form} errors={errors} ids={ids} patch={patch} />

        {expectation ? (
          <p className="-mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-fg-muted">
            <span className="font-medium text-fg-subtle">{t.expectation}</span>
            {expectation}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.severity} htmlFor={ids.severity}>
            <SimpleSelect
              id={ids.severity}
              value={form.severity}
              onValueChange={(severity) => patch({ severity })}
              options={SEVERITY_OPTIONS}
            />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface-2/40 px-3 py-2.5 sm:self-end">
            <div className="flex flex-col gap-0.5">
              <label htmlFor={ids.enabled} className="text-sm font-medium text-fg">
                {t.enabled}
              </label>
              <span className="text-xs text-fg-subtle">{t.enabledHint}</span>
            </div>
            <Switch
              id={ids.enabled}
              checked={form.isEnabled}
              onCheckedChange={(isEnabled) => patch({ isEnabled })}
            />
          </div>
        </div>

        <Field label={t.cron} htmlFor={ids.cron} hint={t.cronHint} optional>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={ids.cron}
              className="font-mono sm:max-w-56"
              value={form.cronExpression}
              maxLength={LIMITS.cronMaxLength}
              placeholder={t.cronPlaceholder}
              spellCheck={false}
              onChange={(event) => patch({ cronExpression: event.target.value })}
            />
            <div className="flex flex-wrap items-center gap-1">
              <PresetButton active={!cronValue} onClick={() => patch({ cronExpression: "" })}>
                {t.cronManual}
              </PresetButton>
              {QUALITY_CRON_PRESETS.map((preset) => (
                <PresetButton
                  key={preset}
                  active={cronValue === CRON_PRESETS[preset]}
                  onClick={() => patch({ cronExpression: CRON_PRESETS[preset] })}
                >
                  {copy.jobs.cronPresets[preset]}
                </PresetButton>
              ))}
            </div>
          </div>
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={pending}>
            {copy.actions.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {check ? t.submitUpdate : t.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface-2/40 p-4">
      <h4 className="text-sm font-medium text-fg">{title}</h4>
      {children}
    </section>
  )
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      size="xs"
      variant="ghost"
      aria-pressed={active}
      onClick={onClick}
      className={cn(active && "bg-accent/15 text-accent-2 hover:bg-accent/20 hover:text-accent-2")}
    >
      {children}
    </Button>
  )
}

type KindFieldsProps = {
  form: CheckFormState
  errors: ReturnType<typeof validateCheckForm>
  ids: Record<"min" | "max" | "maxAge" | "values" | "sql", string>
  patch: (next: Partial<CheckFormState>) => void
}

function KindFields({ form, errors, ids, patch }: KindFieldsProps) {
  if (form.kind === "row_count_between") {
    return (
      <FormSection title={qualityCheckKindLabels.row_count_between}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.min} htmlFor={ids.min} error={errors.range} hint={t.rangeHint}>
            <Input
              id={ids.min}
              type="number"
              inputMode="numeric"
              className="font-mono tabular"
              value={form.min}
              aria-invalid={errors.range ? true : undefined}
              onChange={(event) => patch({ min: event.target.value })}
            />
          </Field>
          <Field label={t.max} htmlFor={ids.max}>
            <Input
              id={ids.max}
              type="number"
              inputMode="numeric"
              className="font-mono tabular"
              value={form.max}
              aria-invalid={errors.range ? true : undefined}
              onChange={(event) => patch({ max: event.target.value })}
            />
          </Field>
        </div>
      </FormSection>
    )
  }
  if (form.kind === "freshness") {
    return (
      <FormSection title={qualityCheckKindLabels.freshness}>
        <Field label={t.maxAgeHours} htmlFor={ids.maxAge} error={errors.maxAgeHours}>
          <Input
            id={ids.maxAge}
            type="number"
            inputMode="decimal"
            min={0}
            className="font-mono tabular sm:max-w-48"
            value={form.maxAgeHours}
            aria-invalid={errors.maxAgeHours ? true : undefined}
            onChange={(event) => patch({ maxAgeHours: event.target.value })}
          />
        </Field>
      </FormSection>
    )
  }
  if (form.kind === "accepted_values") {
    return (
      <FormSection title={qualityCheckKindLabels.accepted_values}>
        <Field
          label={t.acceptedValues}
          htmlFor={ids.values}
          hint={t.acceptedValuesHint}
          error={errors.acceptedValues}
        >
          <Input
            id={ids.values}
            className="font-mono"
            value={form.acceptedValues}
            placeholder={t.acceptedValuesPlaceholder}
            aria-invalid={errors.acceptedValues ? true : undefined}
            onChange={(event) => patch({ acceptedValues: event.target.value })}
          />
        </Field>
      </FormSection>
    )
  }
  if (form.kind === "custom_sql") {
    return (
      <FormSection title={qualityCheckKindLabels.custom_sql}>
        <Field label={t.sql} htmlFor={ids.sql} hint={t.sqlHint} error={errors.sql}>
          <Textarea
            id={ids.sql}
            className="min-h-32 font-mono text-sm"
            value={form.sql}
            spellCheck={false}
            placeholder={t.sqlPlaceholder}
            aria-invalid={errors.sql ? true : undefined}
            onChange={(event) => patch({ sql: event.target.value })}
          />
        </Field>
      </FormSection>
    )
  }
  return null
}
