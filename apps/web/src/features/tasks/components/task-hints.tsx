"use client"

import type { TaskDetail } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { Lightbulb, Lock } from "lucide-react"
import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useRevealHint } from "../api"

function hintLabel(index: number): string {
  return interpolate(copy.tasks.ticket.hintLabel, { number: index + 1 })
}

export function TaskHints({ task }: { task: TaskDetail }) {
  const reveal = useRevealHint(task.id)
  const [open, setOpen] = useState<string[]>([])
  const nextIndex = task.hints.findIndex((hint) => !hint.revealed)

  if (task.hints.length === 0) {
    return <p className="text-sm text-fg-subtle">{copy.tasks.ticket.noHints}</p>
  }

  const onReveal = (position: number) => {
    reveal.mutate(position, {
      onSuccess: (hint) => setOpen((current) => [...current, String(hint.position)]),
      onError: (error) => toast.fromError(error, copy.tasks.ticket.revealFailed),
    })
  }

  return (
    <Accordion
      type="multiple"
      value={open}
      onValueChange={setOpen}
      className="rounded-md border border-border bg-surface px-3"
    >
      {task.hints.map((hint, index) => {
        if (hint.revealed) {
          return (
            <AccordionItem key={hint.position} value={String(hint.position)}>
              <AccordionTrigger>
                <Lightbulb className="size-3.5 text-warning" />
                {hintLabel(index)}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed whitespace-pre-line text-fg">
                {hint.body}
              </AccordionContent>
            </AccordionItem>
          )
        }
        if (index === nextIndex) {
          return (
            <div
              key={hint.position}
              className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-b-0"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                <Lightbulb className="size-3.5 text-fg-muted" />
                {hintLabel(index)}
              </span>
              <Button
                size="xs"
                variant="secondary"
                loading={reveal.isPending}
                onClick={() => onReveal(hint.position)}
              >
                {copy.actions.revealHint}
              </Button>
            </div>
          )
        }
        return (
          <div
            key={hint.position}
            aria-disabled
            className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-fg-subtle last:border-b-0"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Lock className="size-3.5" />
              {hintLabel(index)}
            </span>
            <span className="text-xs">{copy.tasks.ticket.hintLocked}</span>
          </div>
        )
      })}
    </Accordion>
  )
}
