"use client"

import { type SavedQuery, LIMITS } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { type FormEvent, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { SimpleSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useCreateSavedQuery } from "@/features/saved-queries/api"
import { useDatasetOptions } from "../api"

const NO_DATASET = "__none__"

export type SaveQueryInitial = {
  name: string
  datasetSlug?: string | null
}

type SaveQueryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sql: string
  initial: SaveQueryInitial
  saveAs: boolean
  onSaved: (saved: SavedQuery) => void
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, LIMITS.tagMaxLength)),
    ),
  ).slice(0, LIMITS.tagsMaxCount)
}

function SaveQueryForm({
  sql,
  initial,
  saveAs,
  onOpenChange,
  onSaved,
}: Omit<SaveQueryDialogProps, "open">) {
  const create = useCreateSavedQuery()
  const datasets = useDatasetOptions()
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [datasetSlug, setDatasetSlug] = useState(initial.datasetSlug ?? NO_DATASET)
  const [favorite, setFavorite] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      return
    }
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        sqlText: sql,
        datasetSlug: datasetSlug === NO_DATASET ? null : datasetSlug,
        tags: parseTags(tags),
        isFavorite: favorite,
      },
      {
        onSuccess: (saved) => {
          toast.success(copy.workbench.saveDialog.created, saved.name)
          onSaved(saved)
          onOpenChange(false)
        },
      },
    )
  }

  const datasetOptions = [
    { value: NO_DATASET, label: copy.workbench.saveDialog.datasetNone },
    ...[...(datasets.data?.items ?? [])]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((dataset) => ({ value: dataset.slug, label: dataset.name })),
  ]

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <DialogHeader
        title={saveAs ? copy.workbench.saveDialog.titleSaveAs : copy.workbench.saveDialog.title}
        description={copy.workbench.saveDialog.description}
      />
      <DialogBody className="flex flex-col gap-4">
        <Field label={copy.workbench.saveDialog.name} htmlFor="save-query-name">
          <Input
            id="save-query-name"
            autoFocus
            required
            maxLength={LIMITS.nameMaxLength}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.workbench.saveDialog.namePlaceholder}
          />
        </Field>
        <Field
          label={copy.workbench.saveDialog.descriptionLabel}
          htmlFor="save-query-description"
          optional
        >
          <Textarea
            id="save-query-description"
            rows={3}
            maxLength={LIMITS.descriptionMaxLength}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={copy.workbench.saveDialog.descriptionPlaceholder}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={copy.workbench.saveDialog.tags}
            htmlFor="save-query-tags"
            hint={copy.workbench.saveDialog.tagsHint}
            optional
          >
            <Input
              id="save-query-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={copy.workbench.saveDialog.tagsPlaceholder}
            />
          </Field>
          <Field label={copy.workbench.saveDialog.dataset} htmlFor="save-query-dataset" optional>
            <SimpleSelect
              id="save-query-dataset"
              value={datasetSlug}
              onValueChange={setDatasetSlug}
              options={datasetOptions}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <Switch checked={favorite} onCheckedChange={setFavorite} />
          {copy.workbench.saveDialog.favorite}
        </label>
        {create.error ? <InlineError error={create.error} /> : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {copy.actions.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending} disabled={!name.trim()}>
          {copy.workbench.saveDialog.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SaveQueryDialog({ open, onOpenChange, ...props }: SaveQueryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        {open ? <SaveQueryForm {...props} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}
