"use client"

import { LIMITS, type ScheduledQuery } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { type FormEvent, useId, useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
  type SimpleSelectOption,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { useSavedQueries } from "@/features/saved-queries/api"
import { useCreateScheduledQuery, useUpdateScheduledQuery } from "../../api-scheduled"
import { DEFAULT_TIMEZONE } from "../../model/constants"
import {
  CRON_PRESETS,
  CRON_PRESET_IDS,
  CUSTOM_CRON,
  type CronChoice,
  DEFAULT_CRON_PRESET,
  matchCronPreset,
  normalizeCron,
} from "../../model/cron-presets"
import { listTimezones } from "../../model/time"

const t = copy.jobs.scheduleForm

type ScheduleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: ScheduledQuery | null
}

export function ScheduleFormDialog({ open, onOpenChange, schedule }: ScheduleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader title={schedule ? t.editTitle : t.createTitle} description={t.description} />
        <ScheduleForm
          key={schedule?.id ?? "new"}
          schedule={schedule}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type FormState = {
  name: string
  savedQueryId: string
  preset: CronChoice
  cron: string
  timezone: string
  isEnabled: boolean
}

function initialState(schedule: ScheduledQuery | null): FormState {
  if (schedule) {
    return {
      name: schedule.name,
      savedQueryId: schedule.savedQueryId,
      preset: matchCronPreset(schedule.cronExpression) ?? CUSTOM_CRON,
      cron: schedule.cronExpression,
      timezone: schedule.timezone,
      isEnabled: schedule.isEnabled,
    }
  }
  return {
    name: "",
    savedQueryId: "",
    preset: DEFAULT_CRON_PRESET,
    cron: CRON_PRESETS[DEFAULT_CRON_PRESET],
    timezone: DEFAULT_TIMEZONE,
    isEnabled: true,
  }
}

const PRESET_OPTIONS: SimpleSelectOption<CronChoice>[] = [
  ...CRON_PRESET_IDS.map((id) => ({ value: id, label: copy.jobs.cronPresets[id] })),
  { value: CUSTOM_CRON, label: copy.jobs.cronPresets.custom },
]

function ScheduleForm({
  schedule,
  onDone,
}: {
  schedule: ScheduledQuery | null
  onDone: () => void
}) {
  const ids = {
    name: useId(),
    savedQuery: useId(),
    preset: useId(),
    cron: useId(),
    timezone: useId(),
    enabled: useId(),
  }
  const [form, setForm] = useState<FormState>(() => initialState(schedule))
  const [showErrors, setShowErrors] = useState(false)
  const savedQueries = useSavedQueries()
  const create = useCreateScheduledQuery()
  const update = useUpdateScheduledQuery()
  const pending = create.isPending || update.isPending
  const timezones = useMemo(() => listTimezones(schedule?.timezone), [schedule?.timezone])

  const savedQueryOptions = useMemo(() => {
    const items = [...(savedQueries.data?.items ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name),
    )
    const options = items.map((item) => ({ value: item.id, label: item.name }))
    if (schedule && !items.some((item) => item.id === schedule.savedQueryId)) {
      options.unshift({ value: schedule.savedQueryId, label: schedule.savedQueryName })
    }
    return options
  }, [savedQueries.data, schedule])

  const errors = {
    name: showErrors && !form.name.trim() ? t.nameRequired : null,
    savedQuery: showErrors && !form.savedQueryId ? t.savedQueryRequired : null,
    cron: showErrors && !form.cron.trim() ? t.cronRequired : null,
  }
  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }))

  const selectPreset = (preset: CronChoice) =>
    setForm((current) => ({
      ...current,
      preset,
      cron: preset === CUSTOM_CRON ? current.cron : CRON_PRESETS[preset],
    }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (!form.name.trim() || !form.savedQueryId || !form.cron.trim()) {
      return
    }
    const body = {
      name: form.name.trim(),
      savedQueryId: form.savedQueryId,
      cronExpression: normalizeCron(form.cron),
      timezone: form.timezone,
      isEnabled: form.isEnabled,
    }
    const options = {
      onSuccess: () => {
        toast.success(schedule ? t.updated : t.created)
        onDone()
      },
      onError: (error: unknown) => toast.fromError(error),
    }
    if (schedule) {
      update.mutate({ id: schedule.id, body }, options)
    } else {
      create.mutate(body, options)
    }
  }

  const noSavedQueries = !savedQueries.isPending && savedQueryOptions.length === 0

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-4">
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
        <Field
          label={t.savedQuery}
          htmlFor={ids.savedQuery}
          error={errors.savedQuery}
          hint={noSavedQueries ? t.noSavedQueries : undefined}
        >
          <SimpleSelect
            id={ids.savedQuery}
            value={form.savedQueryId || undefined}
            onValueChange={(savedQueryId) => patch({ savedQueryId })}
            options={savedQueryOptions}
            disabled={savedQueries.isPending || noSavedQueries}
            placeholder={savedQueries.isPending ? t.savedQueriesLoading : t.savedQueryPlaceholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.frequency}
            htmlFor={ids.preset}
            hint={
              form.preset === CUSTOM_CRON ? undefined : (
                <span className="font-mono">{CRON_PRESETS[form.preset]}</span>
              )
            }
          >
            <SimpleSelect
              id={ids.preset}
              value={form.preset}
              onValueChange={selectPreset}
              options={PRESET_OPTIONS}
            />
          </Field>
          <Field label={t.timezone} htmlFor={ids.timezone}>
            <Select value={form.timezone} onValueChange={(timezone) => patch({ timezone })}>
              <SelectTrigger id={ids.timezone}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {form.preset === CUSTOM_CRON ? (
          <Field label={t.cron} htmlFor={ids.cron} hint={t.cronHint} error={errors.cron}>
            <Input
              id={ids.cron}
              className="font-mono"
              value={form.cron}
              maxLength={LIMITS.cronMaxLength}
              placeholder={t.cronPlaceholder}
              spellCheck={false}
              aria-invalid={errors.cron ? true : undefined}
              onChange={(event) => patch({ cron: event.target.value })}
            />
          </Field>
        ) : null}
        <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
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
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={pending}>
            {copy.actions.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {schedule ? t.submitUpdate : t.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  )
}
