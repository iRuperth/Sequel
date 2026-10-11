"use client"

import { LIMITS, type SavedQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { type FormEvent, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SimpleSelect, type SimpleSelectOption } from "@/components/ui/select"
import { SqlCode } from "@/components/ui/sql-code"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useDatasets } from "@/features/catalog/api"
import { sortDatasets } from "@/features/catalog/model/catalog"
import { useUpdateSavedQuery } from "../api"
import { DESCRIPTION_INPUT_ROWS, NO_DATASET } from "../model/constants"
import { formatTags, parseTags } from "../model/tags"

type FormErrors = {
  name: string | null
  description: string | null
  tags: string | null
}

function validate(name: string, description: string, tags: readonly string[]): FormErrors {
  const trimmed = name.trim()
  return {
    name: !trimmed
      ? copy.savedQueries.edit.nameRequired
      : trimmed.length > LIMITS.nameMaxLength
        ? interpolate(copy.savedQueries.edit.nameTooLong, { max: LIMITS.nameMaxLength })
        : null,
    description:
      description.length > LIMITS.descriptionMaxLength
        ? interpolate(copy.savedQueries.edit.descriptionTooLong, {
            max: LIMITS.descriptionMaxLength,
          })
        : null,
    tags:
      tags.length > LIMITS.tagsMaxCount
        ? interpolate(copy.savedQueries.edit.tooManyTags, { max: LIMITS.tagsMaxCount })
        : tags.some((tag) => tag.length > LIMITS.tagMaxLength)
          ? interpolate(copy.savedQueries.edit.tagTooLong, { max: LIMITS.tagMaxLength })
          : null,
  }
}

function useDatasetOptions(current: string | null): SimpleSelectOption<string>[] {
  const datasets = useDatasets()
  return useMemo(() => {
    const items = sortDatasets(datasets.data?.items ?? [])
    const options: SimpleSelectOption<string>[] = [
      { value: NO_DATASET, label: copy.savedQueries.edit.datasetNone },
      ...items.map((dataset) => ({
        value: dataset.slug,
        label: (
          <span className="flex items-center gap-2">
            <span>{dataset.name}</span>
            <span className="font-mono text-2xs text-fg-subtle">{dataset.slug}</span>
          </span>
        ),
      })),
    ]
    if (current && !items.some((dataset) => dataset.slug === current)) {
      options.push({
        value: current,
        label: <span className="font-mono text-xs">{current}</span>,
      })
    }
    return options
  }, [datasets.data, current])
}

function EditForm({ query, onClose }: { query: SavedQuery; onClose: () => void }) {
  const ids = useId()
  const [name, setName] = useState(query.name)
  const [description, setDescription] = useState(query.description ?? "")
  const [tagsInput, setTagsInput] = useState(formatTags(query.tags))
  const [dataset, setDataset] = useState(query.datasetSlug ?? NO_DATASET)
  const [isFavorite, setIsFavorite] = useState(query.isFavorite)
  const [submitted, setSubmitted] = useState(false)
  const update = useUpdateSavedQuery()
  const datasetOptions = useDatasetOptions(query.datasetSlug)
  const tags = parseTags(tagsInput)
  const errors = validate(name, description, tags)
  const visibleErrors = submitted ? errors : { name: null, description: null, tags: null }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (errors.name || errors.description || errors.tags) {
      return
    }
    update.mutate(
      {
        id: query.id,
        body: {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          tags,
          datasetSlug: dataset === NO_DATASET ? null : dataset,
          isFavorite,
        },
      },
      {
        onSuccess: () => {
          toast.success(copy.savedQueries.edit.saved)
          onClose()
        },
        onError: (error) => toast.fromError(error),
      },
    )
  }

  const nameId = `${ids}-name`
  const descriptionId = `${ids}-description`
  const tagsId = `${ids}-tags`
  const datasetId = `${ids}-dataset`
  const favouriteId = `${ids}-favourite`

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader
        title={copy.savedQueries.edit.title}
        description={copy.savedQueries.edit.description}
      />
      <DialogBody className="flex flex-col gap-4">
        <Field label={copy.savedQueries.edit.name} htmlFor={nameId} error={visibleErrors.name}>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.savedQueries.edit.namePlaceholder}
            aria-invalid={visibleErrors.name ? true : undefined}
            autoFocus
          />
        </Field>
        <Field
          label={copy.savedQueries.edit.descriptionLabel}
          htmlFor={descriptionId}
          error={visibleErrors.description}
          optional
        >
          <Textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={copy.savedQueries.edit.descriptionPlaceholder}
            aria-invalid={visibleErrors.description ? true : undefined}
            rows={DESCRIPTION_INPUT_ROWS}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={copy.savedQueries.edit.tags}
            htmlFor={tagsId}
            hint={copy.savedQueries.edit.tagsHint}
            error={visibleErrors.tags}
            optional
          >
            <Input
              id={tagsId}
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder={copy.savedQueries.edit.tagsPlaceholder}
              aria-invalid={visibleErrors.tags ? true : undefined}
            />
          </Field>
          <Field label={copy.savedQueries.edit.dataset} htmlFor={datasetId}>
            <SimpleSelect
              id={datasetId}
              value={dataset}
              onValueChange={setDataset}
              options={datasetOptions}
            />
          </Field>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-md bg-surface-2/60 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={favouriteId}>{copy.savedQueries.edit.favourite}</Label>
            <span className="text-xs text-fg-subtle">{copy.savedQueries.edit.favouriteHint}</span>
          </div>
          <Switch id={favouriteId} checked={isFavorite} onCheckedChange={setIsFavorite} />
        </div>
        <Field label={copy.savedQueries.edit.sql} hint={copy.savedQueries.edit.sqlHint}>
          <div className="rounded-md border border-border bg-surface-2/40">
            <SqlCode sql={query.sqlText} wrap className="max-h-48 px-3 py-2.5" />
          </div>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
          {copy.actions.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={update.isPending}>
          {copy.savedQueries.edit.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}

type SavedQueryEditDialogProps = {
  query: SavedQuery | null
  onClose: () => void
}

export function SavedQueryEditDialog({ query, onClose }: SavedQueryEditDialogProps) {
  return (
    <Dialog open={query !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="lg">
        {query ? <EditForm key={query.id} query={query} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
