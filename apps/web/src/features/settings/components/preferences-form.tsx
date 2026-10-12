"use client"

import { TRACKS, type Preferences, type Track } from "@sequel/contracts"
import { copy, interpolate, trackDescriptions, trackLabels } from "@sequel/copy"
import { ListChecks, SquareCode, Table2 } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { InlineError } from "@/components/ui/error-state"
import { KeyCombo } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { SimpleSelect } from "@/components/ui/select"
import { StatusDot } from "@/components/ui/status-dot"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { useHotkey } from "@/lib/hooks/use-hotkey"
import { useKeyLabels } from "@/lib/hooks/use-platform"
import { useUpdatePreferences } from "../api"
import {
  changedPreferences,
  fontSizeChoices,
  pageSizeChoices,
  tabSizeChoices,
} from "../model/preferences"
import { EditorPreview } from "./editor-preview"

const settingsCopy = copy.settings
const SAVE_HOTKEY = { key: "s", mod: true } as const

const TRACK_OPTIONS = TRACKS.map((track) => ({ value: track, label: trackLabels[track] }))

function numberOptions(values: readonly number[], template: string) {
  return values.map((value) => ({
    value: String(value),
    label: interpolate(template, { size: value }),
  }))
}

function SettingRow({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}

type SetPreference = <TKey extends keyof Preferences>(key: TKey, value: Preferences[TKey]) => void

function EditorCard({ values, set }: { values: Preferences; set: SetPreference }) {
  const id = useId()
  const editorCopy = settingsCopy.editor
  return (
    <Card>
      <CardHeader
        icon={<SquareCode />}
        title={editorCopy.title}
        description={editorCopy.description}
      />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-border">
          <SettingRow id={`${id}-font`} label={editorCopy.fontSize}>
            <SimpleSelect
              id={`${id}-font`}
              className="w-36"
              value={String(values.editorFontSize)}
              onValueChange={(value) => set("editorFontSize", Number(value))}
              options={numberOptions(
                fontSizeChoices(values.editorFontSize),
                editorCopy.fontSizeOption,
              )}
            />
          </SettingRow>
          <SettingRow id={`${id}-tab`} label={editorCopy.tabSize}>
            <SimpleSelect
              id={`${id}-tab`}
              className="w-36"
              value={String(values.editorTabSize)}
              onValueChange={(value) => set("editorTabSize", Number(value))}
              options={numberOptions(
                tabSizeChoices(values.editorTabSize),
                editorCopy.tabSizeOption,
              )}
            />
          </SettingRow>
          <SettingRow id={`${id}-wrap`} label={editorCopy.wordWrap} hint={editorCopy.wordWrapHint}>
            <Switch
              id={`${id}-wrap`}
              checked={values.editorWordWrap}
              onCheckedChange={(checked) => set("editorWordWrap", checked)}
            />
          </SettingRow>
          <SettingRow
            id={`${id}-lines`}
            label={editorCopy.lineNumbers}
            hint={editorCopy.lineNumbersHint}
          >
            <Switch
              id={`${id}-lines`}
              checked={values.editorLineNumbers}
              onCheckedChange={(checked) => set("editorLineNumbers", checked)}
            />
          </SettingRow>
          <SettingRow
            id={`${id}-complete`}
            label={editorCopy.autocomplete}
            hint={editorCopy.autocompleteHint}
          >
            <Switch
              id={`${id}-complete`}
              checked={values.editorAutocomplete}
              onCheckedChange={(checked) => set("editorAutocomplete", checked)}
            />
          </SettingRow>
        </div>
        <EditorPreview
          editorFontSize={values.editorFontSize}
          editorTabSize={values.editorTabSize}
          editorWordWrap={values.editorWordWrap}
          editorLineNumbers={values.editorLineNumbers}
        />
      </CardBody>
    </Card>
  )
}

function ResultsCard({ values, set }: { values: Preferences; set: SetPreference }) {
  const id = useId()
  const resultsCopy = settingsCopy.results
  return (
    <Card>
      <CardHeader
        icon={<Table2 />}
        title={resultsCopy.title}
        description={resultsCopy.description}
      />
      <CardBody>
        <SettingRow id={`${id}-page`} label={resultsCopy.pageSize} hint={resultsCopy.pageSizeHint}>
          <SimpleSelect
            id={`${id}-page`}
            className="w-36"
            value={String(values.resultPageSize)}
            onValueChange={(value) => set("resultPageSize", Number(value))}
            options={numberOptions(
              pageSizeChoices(values.resultPageSize),
              resultsCopy.pageSizeOption,
            )}
          />
        </SettingRow>
      </CardBody>
    </Card>
  )
}

function TasksCard({ values, set }: { values: Preferences; set: SetPreference }) {
  const id = useId()
  const tasksCopy = settingsCopy.tasks
  return (
    <Card>
      <CardHeader
        icon={<ListChecks />}
        title={tasksCopy.title}
        description={tasksCopy.description}
      />
      <CardBody className="flex flex-col divide-y divide-border">
        <SettingRow
          id={`${id}-track`}
          label={tasksCopy.defaultTrack}
          hint={trackDescriptions[values.defaultTrack]}
        >
          <SimpleSelect<Track>
            id={`${id}-track`}
            className="w-44"
            value={values.defaultTrack}
            onValueChange={(value) => set("defaultTrack", value)}
            options={TRACK_OPTIONS}
          />
        </SettingRow>
        <SettingRow id={`${id}-review`} label={tasksCopy.aiReview} hint={tasksCopy.aiReviewHint}>
          <Switch
            id={`${id}-review`}
            checked={values.llmFeedbackEnabled}
            onCheckedChange={(checked) => set("llmFeedbackEnabled", checked)}
          />
        </SettingRow>
      </CardBody>
    </Card>
  )
}

export function PreferencesForm({ preferences }: { preferences: Preferences }) {
  const [draft, setDraft] = useState<Partial<Preferences>>({})
  const update = useUpdatePreferences()
  const keys = useKeyLabels()
  const values: Preferences = { ...preferences, ...draft }
  const changes = changedPreferences(preferences, values)
  const dirty = Object.keys(changes).length > 0

  const set: SetPreference = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = () => {
    if (!dirty || update.isPending) {
      return
    }
    update.mutate(changes, {
      onSuccess: () => {
        setDraft({})
        toast.success(settingsCopy.footer.saved)
      },
    })
  }

  const discard = () => {
    setDraft({})
    update.reset()
  }

  useHotkey(SAVE_HOTKEY, save, dirty)

  return (
    <div className="flex flex-col gap-4">
      <EditorCard values={values} set={set} />
      <ResultsCard values={values} set={set} />
      <TasksCard values={values} set={set} />
      {dirty ? (
        <div
          role="region"
          aria-label={settingsCopy.footer.unsaved}
          className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-md border border-border-strong bg-surface-2 px-4 py-2.5 animate-fade-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-fg">
              <StatusDot tone="warning" />
              {settingsCopy.footer.unsaved}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={discard} disabled={update.isPending}>
                {settingsCopy.footer.discard}
              </Button>
              <Tooltip content={<KeyCombo keys={[keys.mod, keys.s]} />}>
                <Button variant="primary" onClick={save} loading={update.isPending}>
                  {settingsCopy.footer.save}
                </Button>
              </Tooltip>
            </div>
          </div>
          {update.isError ? <InlineError error={update.error} /> : null}
        </div>
      ) : null}
    </div>
  )
}
