"use client"

import {
  LIMITS,
  VALUE_FORMATS,
  type ValueFormat,
  type Widget,
  type WidgetPosition,
} from "@sequel/contracts"
import { DEFAULT_CURRENCY, copy, interpolate, valueFormatLabels } from "@sequel/copy"
import { type FormEvent, useEffect, useId, useMemo, useState } from "react"
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
import { MultiSelect } from "@/components/ui/multi-select"
import { SimpleSelect, type SimpleSelectOption } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { LAYOUT } from "@/config/constants"
import { useSavedQueries } from "@/features/saved-queries/api"
import { cn } from "@/lib/cn"
import { useCreateWidget, useSavedQueryColumns, useUpdateWidget } from "../api"
import { CURRENCY_CODE_LENGTH, WIDGET_MAX_ROWS } from "../model/constants"
import type { ColumnOption } from "../model/widget-data"
import {
  type ColumnMode,
  initialWidgetForm,
  isChartKind,
  textToPosition,
  toWidgetRequest,
  validateWidgetForm,
  type WidgetFormState,
  withColumnDefaults,
  withKind,
} from "../model/widget-form"
import { WidgetKindPicker } from "./widget-kind-picker"

const t = copy.dashboards.widgetDialog

type WidgetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboardId: string
  widgets: readonly Widget[]
  widget: Widget | null
}

export function WidgetDialog({
  open,
  onOpenChange,
  dashboardId,
  widgets,
  widget,
}: WidgetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader title={widget ? t.editTitle : t.createTitle} description={t.description} />
        <WidgetForm
          key={widget?.id ?? "new"}
          dashboardId={dashboardId}
          widgets={widgets}
          widget={widget}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

const FORMAT_OPTIONS: SimpleSelectOption<ValueFormat>[] = VALUE_FORMATS.map((format) => ({
  value: format,
  label: valueFormatLabels[format],
}))

function columnOptions(
  columns: readonly ColumnOption[],
  current: string,
): SimpleSelectOption<string>[] {
  const options = columns.map((column) => ({
    value: column.name,
    label: (
      <span className="flex items-baseline gap-2">
        <span className="font-mono">{column.name}</span>
        <span className="text-2xs text-fg-subtle">{column.dataType}</span>
      </span>
    ),
  }))
  if (current && !columns.some((column) => column.name === current)) {
    options.unshift({ value: current, label: <span className="font-mono">{current}</span> })
  }
  return options
}

type WidgetFormProps = {
  dashboardId: string
  widgets: readonly Widget[]
  widget: Widget | null
  onDone: () => void
}

function WidgetForm({ dashboardId, widgets, widget, onDone }: WidgetFormProps) {
  const ids = {
    title: useId(),
    savedQuery: useId(),
    x: useId(),
    y: useId(),
    value: useId(),
    format: useId(),
    currency: useId(),
  }
  const [form, setForm] = useState<WidgetFormState>(() => initialWidgetForm(widget, widgets))
  const [showErrors, setShowErrors] = useState(false)
  const savedQueries = useSavedQueries()
  const create = useCreateWidget(dashboardId)
  const update = useUpdateWidget(dashboardId)
  const pending = create.isPending || update.isPending

  const savedQueryItems = useMemo(
    () =>
      [...(savedQueries.data?.items ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [savedQueries.data],
  )
  const savedQuery = savedQueryItems.find((item) => item.id === form.savedQueryId) ?? null
  const columnsQuery = useSavedQueryColumns(savedQuery?.id ?? null, savedQuery?.sqlText ?? null)
  const columns = columnsQuery.data

  const columnMode: ColumnMode = !form.savedQueryId
    ? "none"
    : columns
      ? "select"
      : columnsQuery.isError || (!savedQuery && !savedQueries.isPending)
        ? "text"
        : "loading"

  useEffect(() => {
    if (columns && columns.length > 0) {
      setForm((current) => withColumnDefaults(current, columns))
    }
  }, [columns])

  const errors = showErrors ? validateWidgetForm(form, columnMode) : {}
  const chart = isChartKind(form.kind)
  const patch = (next: Partial<WidgetFormState>) => setForm((current) => ({ ...current, ...next }))

  const selectSavedQuery = (id: string) => {
    const selected = savedQueryItems.find((item) => item.id === id)
    setForm((current) => ({
      ...current,
      savedQueryId: id,
      title: current.title.trim() ? current.title : (selected?.name ?? current.title),
      xColumn: "",
      yColumns: [],
      yColumnsText: "",
      valueColumn: "",
    }))
  }

  const setPosition = (key: keyof WidgetPosition, value: string) =>
    setForm((current) => ({
      ...current,
      positionTouched: true,
      position: { ...current.position, [key]: value },
    }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    const found = validateWidgetForm(form, columnMode)
    if (Object.keys(found).length > 0) {
      return
    }
    const body = toWidgetRequest(form, columnMode)
    const options = {
      onSuccess: () => {
        toast.success(widget ? t.updated : t.created)
        onDone()
      },
      onError: (error: unknown) => toast.fromError(error),
    }
    if (widget) {
      update.mutate({ widgetId: widget.id, body }, options)
    } else {
      create.mutate(body, options)
    }
  }

  const savedQueryOptions = savedQueryItems.map((item) => ({ value: item.id, label: item.name }))
  const columnList = columns ?? []

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.titleLabel}
            htmlFor={ids.title}
            error={errors.title ? t.titleRequired : null}
          >
            <Input
              id={ids.title}
              value={form.title}
              maxLength={LIMITS.nameMaxLength}
              placeholder={t.titlePlaceholder}
              aria-invalid={errors.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          <Field
            label={t.savedQuery}
            htmlFor={ids.savedQuery}
            error={errors.savedQueryId ? t.savedQueryRequired : null}
            hint={
              !savedQueries.isPending && savedQueryItems.length === 0 ? t.noSavedQueries : undefined
            }
          >
            <SimpleSelect
              id={ids.savedQuery}
              value={form.savedQueryId || undefined}
              onValueChange={selectSavedQuery}
              options={savedQueryOptions}
              disabled={savedQueries.isPending || savedQueryItems.length === 0}
              placeholder={savedQueries.isPending ? t.savedQueriesLoading : t.savedQueryPlaceholder}
            />
          </Field>
        </div>

        <Field label={t.kind} hint={t.kindHints[form.kind]}>
          <WidgetKindPicker
            value={form.kind}
            onValueChange={(kind) => setForm((current) => withKind(current, kind))}
            ariaLabel={t.kind}
          />
        </Field>

        {form.kind !== "table" ? (
          <section className="flex flex-col gap-4 rounded-md border border-border bg-surface-2/40 p-4">
            {columnMode === "none" ? (
              <p className="text-sm text-fg-muted">{t.pickQueryFirst}</p>
            ) : columnMode === "loading" ? (
              <p className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <Spinner className="size-3.5" />
                {t.loadingColumns}
              </p>
            ) : columnMode === "text" ? (
              <p className="text-xs text-warning">{t.columnsUnavailable}</p>
            ) : null}

            {columnMode === "select" || columnMode === "text" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {chart ? (
                  <>
                    <Field
                      label={t.xColumn}
                      htmlFor={ids.x}
                      error={errors.xColumn ? t.columnRequired : null}
                    >
                      {columnMode === "select" ? (
                        <SimpleSelect
                          id={ids.x}
                          value={form.xColumn || undefined}
                          onValueChange={(value) => patch({ xColumn: value })}
                          options={columnOptions(columnList, form.xColumn)}
                          placeholder={t.columnPlaceholder}
                        />
                      ) : (
                        <Input
                          id={ids.x}
                          className="font-mono"
                          value={form.xColumn}
                          placeholder={t.columnFreeTextPlaceholder}
                          aria-invalid={errors.xColumn}
                          onChange={(event) => patch({ xColumn: event.target.value })}
                        />
                      )}
                    </Field>
                    <Field
                      label={t.yColumns}
                      htmlFor={ids.y}
                      error={errors.yColumns ? t.seriesRequired : null}
                      hint={columnMode === "text" ? t.yColumnsFreeTextHint : undefined}
                    >
                      {columnMode === "select" ? (
                        <MultiSelect
                          id={ids.y}
                          value={form.yColumns}
                          onValueChange={(value) => patch({ yColumns: value })}
                          options={columnList.map((column) => ({
                            value: column.name,
                            label: column.name,
                            description: column.dataType,
                          }))}
                          placeholder={t.yColumnsPlaceholder}
                          searchPlaceholder={t.yColumnsSearch}
                          emptyLabel={t.yColumnsEmpty}
                          removeLabel={t.yColumnsRemove}
                        />
                      ) : (
                        <Input
                          id={ids.y}
                          className="font-mono"
                          value={form.yColumnsText}
                          placeholder={t.columnFreeTextPlaceholder}
                          aria-invalid={errors.yColumns}
                          onChange={(event) => patch({ yColumnsText: event.target.value })}
                        />
                      )}
                    </Field>
                  </>
                ) : (
                  <Field
                    label={t.valueColumn}
                    htmlFor={ids.value}
                    error={errors.valueColumn ? t.columnRequired : null}
                    hint={t.valueColumnHint}
                  >
                    {columnMode === "select" ? (
                      <SimpleSelect
                        id={ids.value}
                        value={form.valueColumn || undefined}
                        onValueChange={(value) => patch({ valueColumn: value })}
                        options={columnOptions(columnList, form.valueColumn)}
                        placeholder={t.columnPlaceholder}
                      />
                    ) : (
                      <Input
                        id={ids.value}
                        className="font-mono"
                        value={form.valueColumn}
                        placeholder={t.columnFreeTextPlaceholder}
                        aria-invalid={errors.valueColumn}
                        onChange={(event) => patch({ valueColumn: event.target.value })}
                      />
                    )}
                  </Field>
                )}
                <Field label={t.format} htmlFor={ids.format}>
                  <SimpleSelect
                    id={ids.format}
                    value={form.format}
                    onValueChange={(format) => patch({ format })}
                    options={FORMAT_OPTIONS}
                  />
                </Field>
                {form.format === "currency" ? (
                  <Field label={t.currency} htmlFor={ids.currency} hint={t.currencyHint} optional>
                    <Input
                      id={ids.currency}
                      className="font-mono uppercase"
                      value={form.currency}
                      maxLength={CURRENCY_CODE_LENGTH}
                      placeholder={DEFAULT_CURRENCY}
                      onChange={(event) => patch({ currency: event.target.value })}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <PositionFields position={form.position} onChange={setPosition} />
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={pending}>
            {copy.actions.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {widget ? t.submitUpdate : t.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}

const POSITION_FIELDS: { key: keyof WidgetPosition; label: string; min: number; max?: number }[] = [
  { key: "x", label: t.positionX, min: 0, max: LIMITS.widgetGridColumns - 1 },
  { key: "y", label: t.positionY, min: 0 },
  { key: "w", label: t.positionW, min: 1, max: LIMITS.widgetGridColumns },
  { key: "h", label: t.positionH, min: 1, max: WIDGET_MAX_ROWS },
]

function PositionFields({
  position,
  onChange,
}: {
  position: WidgetFormState["position"]
  onChange: (key: keyof WidgetPosition, value: string) => void
}) {
  const baseId = useId()
  const resolved = textToPosition(position)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-medium text-fg">{t.layout}</h4>
        <p className="text-xs text-fg-subtle">
          {interpolate(t.layoutHint, {
            columns: LIMITS.widgetGridColumns,
            height: LAYOUT.dashboardRowHeight,
          })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POSITION_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} htmlFor={`${baseId}-${field.key}`}>
            <Input
              id={`${baseId}-${field.key}`}
              type="number"
              inputMode="numeric"
              className="font-mono tabular"
              min={field.min}
              max={field.max}
              value={position[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </Field>
        ))}
      </div>
      <div
        aria-hidden
        className="grid h-3 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${LIMITS.widgetGridColumns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: LIMITS.widgetGridColumns }, (_, index) => (
          <span
            key={index}
            className={cn(
              "rounded-xs",
              index >= resolved.x && index < resolved.x + resolved.w
                ? "bg-accent/60"
                : "bg-surface-3",
            )}
          />
        ))}
      </div>
    </section>
  )
}
