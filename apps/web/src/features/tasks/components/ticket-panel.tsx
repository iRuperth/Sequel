"use client"

import type { TaskDetail } from "@sequel/contracts"
import { columnTypeHintLabels, copy, interpolate } from "@sequel/copy"
import { ArrowUpRight, Check, Database, Info } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { routeTo } from "@/config/routes"
import { cn } from "@/lib/cn"
import { useDatasets } from "../api"
import { SolutionCard } from "./solution-card"
import { TaskHints } from "./task-hints"

const PENDING_LINES = ["w-11/12", "w-4/5", "w-3/5", "w-5/6", "w-2/3"] as const

function Section({
  title,
  meta,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{title}</h2>
        {meta ? <span className="text-xs text-fg-subtle">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

function AcceptanceCriteria({ items, solved }: { items: readonly string[]; solved: boolean }) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-0.5 rounded-md border border-border p-1",
        solved ? "bg-success/10" : "bg-surface",
      )}
    >
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 rounded-sm px-2 py-1.5 text-sm text-fg">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-xs",
              solved ? "bg-success/20 text-success" : "border border-border-strong",
            )}
          >
            {solved ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ExpectedOutput({ task }: { task: TaskDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2">
            <tr>
              <th className="h-7 border-b border-border px-3 text-left text-xs font-medium text-fg-muted">
                {copy.tasks.ticket.column}
              </th>
              <th className="h-7 border-b border-border px-3 text-left text-xs font-medium text-fg-muted">
                {copy.tasks.ticket.type}
              </th>
            </tr>
          </thead>
          <tbody>
            {task.expectedColumns.map((column) => (
              <tr key={column.name} className="border-b border-border last:border-b-0">
                <td className="h-7 px-3 font-mono text-xs text-fg">{column.name}</td>
                <td className="h-7 px-3 font-mono text-xs text-fg-muted">
                  {columnTypeHintLabels[column.typeHint]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-fg-muted">
        <Info className="mt-0.5 size-3 shrink-0" />
        {task.orderMatters ? copy.tasks.ticket.orderMatters : copy.tasks.ticket.orderIgnored}
      </p>
    </div>
  )
}

function DatasetLinks({ slugs }: { slugs: readonly string[] }) {
  const datasets = useDatasets()
  const names = useMemo(
    () => new Map((datasets.data?.items ?? []).map((item) => [item.slug, item.name])),
    [datasets.data],
  )
  return (
    <ul className="flex flex-wrap gap-1.5">
      {slugs.map((slug) => (
        <li key={slug}>
          <Link
            href={routeTo.catalogDataset(slug)}
            className="group inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-sm text-fg transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            <Database className="size-3.5 text-fg-muted" />
            <span className="font-mono text-xs">{slug}</span>
            {names.get(slug) ? (
              <span className="text-xs text-fg-muted">{names.get(slug)}</span>
            ) : null}
            <ArrowUpRight className="size-3 text-fg-subtle group-hover:text-fg" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function PendingDetails() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-fg-muted">{copy.tasks.ticket.pendingDetails}</p>
      {[copy.tasks.ticket.description, copy.tasks.ticket.requirements].map((title) => (
        <Section key={title} title={title}>
          <div className="flex flex-col gap-2">
            {PENDING_LINES.map((width) => (
              <Skeleton key={width} className={cn("h-3", width)} />
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}

export function TicketPanel({ task }: { task: TaskDetail }) {
  if (task.status === "generating" || task.status === "failed_generation") {
    return <PendingDetails />
  }
  const solved = task.status === "solved"
  const revealed = task.hints.filter((hint) => hint.revealed).length
  return (
    <div className="flex flex-col gap-6">
      {task.solution ? <SolutionCard solution={task.solution} /> : null}
      {task.businessContext ? (
        <Section title={copy.tasks.ticket.description}>
          <p className="text-base leading-relaxed whitespace-pre-line text-fg">
            {task.businessContext}
          </p>
        </Section>
      ) : null}
      {task.requirements.length > 0 ? (
        <Section title={copy.tasks.ticket.requirements}>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-fg marker:font-mono marker:text-xs marker:text-fg-subtle">
            {task.requirements.map((item, index) => (
              <li key={index} className="pl-1">
                {item}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
      {task.acceptanceCriteria.length > 0 ? (
        <Section
          title={copy.tasks.ticket.acceptanceCriteria}
          meta={
            solved ? <span className="text-success">{copy.tasks.ticket.criteriaMet}</span> : null
          }
        >
          <AcceptanceCriteria items={task.acceptanceCriteria} solved={solved} />
        </Section>
      ) : null}
      {task.expectedColumns.length > 0 ? (
        <Section title={copy.tasks.ticket.expectedOutput}>
          <ExpectedOutput task={task} />
        </Section>
      ) : null}
      {task.datasetSlugs.length > 0 ? (
        <Section title={copy.tasks.ticket.datasets}>
          <DatasetLinks slugs={task.datasetSlugs} />
        </Section>
      ) : null}
      <Section
        title={copy.tasks.ticket.hints}
        meta={
          task.hints.length > 0
            ? interpolate(copy.tasks.ticket.hintsRevealed, {
                revealed,
                total: task.hints.length,
              })
            : null
        }
      >
        <TaskHints task={task} />
      </Section>
    </div>
  )
}
