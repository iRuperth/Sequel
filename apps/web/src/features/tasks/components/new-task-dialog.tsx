"use client"

import {
  DIFFICULTIES,
  type Difficulty,
  type GenerateTaskRequest,
  LIMITS,
  TOPICS,
  TRACKS,
  type Topic,
  type Track,
} from "@sequel/contracts"
import {
  copy,
  difficultyLabels,
  difficultySeniority,
  interpolate,
  taskTexts,
  topicLabels,
  trackDescriptions,
  trackLabels,
} from "@sequel/copy"
import { Check, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/error-state"
import { Field } from "@/components/ui/field"
import { MultiSelect } from "@/components/ui/multi-select"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SimpleSelect } from "@/components/ui/select"
import { SELECT_ALL } from "@/config/constants"
import { routeTo } from "@/config/routes"
import { useLlmStatus, usePreferences } from "@/features/settings/api"
import { cn } from "@/lib/cn"
import { useDatasets, useGenerateTask } from "../api"
import { RECOMMENDED_DIFFICULTY } from "../model/constants"

type DifficultyChoice = Difficulty | typeof RECOMMENDED_DIFFICULTY

const DIFFICULTY_OPTIONS: readonly { value: DifficultyChoice; label: string }[] = [
  { value: RECOMMENDED_DIFFICULTY, label: copy.tasks.create.recommended },
  ...DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficultyLabels[difficulty] })),
]

const TOPIC_OPTIONS = TOPICS.map((topic) => ({ value: topic, label: topicLabels[topic] }))

function TrackCards({ value, onChange }: { value: Track; onChange: (track: Track) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label={copy.tasks.create.trackLabel}
      className="grid gap-2 sm:grid-cols-3"
    >
      {TRACKS.map((track) => {
        const selected = track === value
        return (
          <button
            key={track}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(track)}
            className={cn(
              "relative flex flex-col gap-1 rounded-md border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-border-strong bg-accent/12"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg">{trackLabels[track]}</span>
              <span
                aria-hidden
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-accent text-accent-fg" : "border border-border-strong",
                )}
              >
                {selected ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
            </span>
            <span className="text-xs text-fg-muted">{trackDescriptions[track]}</span>
          </button>
        )
      })}
    </div>
  )
}

function NewTaskForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter()
  const preferences = usePreferences()
  const llm = useLlmStatus()
  const datasets = useDatasets()
  const generate = useGenerateTask()
  const topicsId = useId()
  const datasetId = useId()
  const [track, setTrack] = useState<Track | null>(null)
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(RECOMMENDED_DIFFICULTY)
  const [topics, setTopics] = useState<Topic[]>([])
  const [dataset, setDataset] = useState<string>(SELECT_ALL)
  const selectedTrack = track ?? preferences.defaultTrack
  const notConfigured = llm.data?.configured === false

  const datasetOptions = useMemo(() => {
    const items = [...(datasets.data?.items ?? [])].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    )
    return [
      { value: SELECT_ALL, label: copy.tasks.create.anyDataset },
      ...items.map((item) => ({ value: item.slug, label: item.name })),
    ]
  }, [datasets.data])

  const difficultyHint =
    difficulty === RECOMMENDED_DIFFICULTY
      ? copy.tasks.create.recommendedHint
      : interpolate(copy.tasks.create.seniorityHint, {
          seniority: difficultySeniority[difficulty],
        })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body: GenerateTaskRequest = { track: selectedTrack }
    if (difficulty !== RECOMMENDED_DIFFICULTY) {
      body.difficulty = difficulty
    }
    if (topics.length > 0) {
      body.topics = topics
    }
    if (dataset !== SELECT_ALL) {
      body.datasetSlug = dataset
    }
    generate.mutate(body, {
      onSuccess: ({ taskId }) => router.push(routeTo.task(taskId)),
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-5">
        {notConfigured ? (
          <div className="flex items-start gap-2 rounded-md bg-warning/12 px-3 py-2 text-sm text-warning">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{taskTexts.generationNotConfigured}</span>
          </div>
        ) : null}
        <Field label={copy.tasks.create.trackLabel}>
          <TrackCards value={selectedTrack} onChange={setTrack} />
        </Field>
        <Field label={copy.tasks.create.difficultyLabel} hint={difficultyHint}>
          <SegmentedControl
            value={difficulty}
            onValueChange={setDifficulty}
            options={DIFFICULTY_OPTIONS}
            ariaLabel={copy.tasks.create.difficultyLabel}
            className="self-start"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={copy.tasks.create.topicsLabel}
            htmlFor={topicsId}
            optional
            hint={interpolate(copy.tasks.create.topicsHint, { max: LIMITS.topicsPerTaskMax })}
          >
            <MultiSelect
              id={topicsId}
              options={TOPIC_OPTIONS}
              value={topics}
              onValueChange={setTopics}
              placeholder={copy.tasks.create.topicsPlaceholder}
              searchPlaceholder={copy.tasks.create.topicsSearch}
              emptyLabel={copy.tasks.create.topicsEmpty}
              removeLabel={copy.tasks.create.topicsRemove}
              max={LIMITS.topicsPerTaskMax}
            />
          </Field>
          <Field
            label={copy.tasks.create.datasetLabel}
            htmlFor={datasetId}
            optional
            hint={datasets.isError ? copy.tasks.create.datasetsUnavailable : undefined}
          >
            <SimpleSelect
              id={datasetId}
              value={dataset}
              onValueChange={setDataset}
              options={datasetOptions}
              disabled={datasets.isPending}
              placeholder={copy.states.loading}
            />
          </Field>
        </div>
        {generate.isError ? <InlineError error={generate.error} /> : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={generate.isPending}>
          {copy.actions.cancel}
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={generate.isPending || generate.isSuccess}
          disabled={notConfigured}
        >
          {copy.tasks.create.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function NewTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader title={copy.tasks.create.title} description={copy.tasks.create.description} />
        {open ? <NewTaskForm onCancel={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
