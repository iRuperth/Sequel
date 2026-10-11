"use client"

import type { ExplainPlan, PlanNode } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { formatCompact, formatDuration, formatNumber, formatPercent } from "@/lib/format"
import {
  type IndexedPlanNode,
  collectIds,
  countNodes,
  indexPlan,
  misestimateFactor,
  relationLabel,
} from "../model/plan"

const INDENT_PX = 18

function NodeDetails({ node }: { node: PlanNode }) {
  const rows: { label: string; value: string }[] = []
  if (node.filter) {
    rows.push({ label: copy.explain.filter, value: node.filter })
  }
  if (node.condition) {
    rows.push({ label: copy.explain.condition, value: node.condition })
  }
  if (node.indexName) {
    rows.push({ label: copy.explain.index, value: node.indexName })
  }
  if (node.sortKey && node.sortKey.length > 0) {
    rows.push({ label: copy.explain.sortKey, value: node.sortKey.join(", ") })
  }
  if (node.groupKey && node.groupKey.length > 0) {
    rows.push({ label: copy.explain.groupKey, value: node.groupKey.join(", ") })
  }
  if (node.joinType) {
    rows.push({ label: copy.explain.joinType, value: node.joinType })
  }
  if (node.strategy) {
    rows.push({ label: copy.explain.strategy, value: node.strategy })
  }
  for (const [key, value] of Object.entries(node.details)) {
    rows.push({ label: key, value })
  }
  if (rows.length === 0) {
    return null
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 py-1.5 text-xs">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="contents">
          <dt className="text-fg-muted">{row.label}</dt>
          <dd className="font-mono break-words text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PlanRow({
  entry,
  rootCost,
  analyzed,
  expanded,
  onToggle,
}: {
  entry: IndexedPlanNode
  rootCost: number
  analyzed: boolean
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const { node } = entry
  const open = expanded.has(entry.id)
  const share = rootCost > 0 ? Math.min(node.totalCost / rootCost, 1) : 0
  const misestimate = analyzed ? misestimateFactor(node) : null
  const relation = relationLabel(node)
  return (
    <li>
      <div
        className="group grid grid-cols-[minmax(0,1fr)_180px_88px_88px_88px] items-center gap-3 border-b border-border/60 pr-3 hover:bg-surface-2/50"
        style={{ paddingLeft: entry.depth * INDENT_PX + 8 }}
      >
        <button
          type="button"
          onClick={() => onToggle(entry.id)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 py-1.5 text-left"
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-fg-subtle transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate text-sm font-medium text-fg">{node.nodeType}</span>
          {relation ? (
            <span className="truncate font-mono text-xs text-accent-2">
              {interpolate(copy.explain.onRelation, { relation })}
            </span>
          ) : null}
          {node.joinType ? <Badge className="h-4 px-1 text-2xs">{node.joinType}</Badge> : null}
          {misestimate ? (
            <Tooltip
              content={interpolate(copy.explain.misestimate, {
                factor: formatNumber(misestimate, "integer"),
              })}
            >
              <TriangleAlert className="size-3.5 shrink-0 text-warning" />
            </Tooltip>
          ) : null}
        </button>
        <Tooltip content={interpolate(copy.explain.costShare, { percent: formatPercent(share) })}>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent-2/70"
                style={{ width: `${share * 100}%` }}
              />
            </div>
            <span className="w-14 text-right font-mono text-2xs text-fg-muted tabular">
              {formatNumber(node.totalCost)}
            </span>
          </div>
        </Tooltip>
        <span className="text-right font-mono text-xs text-fg-muted tabular">
          {formatCompact(node.planRows)}
        </span>
        <span
          className={cn(
            "text-right font-mono text-xs tabular",
            misestimate ? "text-warning" : "text-fg",
          )}
        >
          {analyzed ? formatCompact(node.actualRows) : copy.common.notAvailable}
        </span>
        <span className="text-right font-mono text-xs text-fg tabular">
          {analyzed ? formatDuration(node.actualTotalTime) : copy.common.notAvailable}
        </span>
      </div>
      {open ? (
        <div
          className="border-b border-border/60 bg-surface-2/30 pr-3"
          style={{ paddingLeft: entry.depth * INDENT_PX + 30 }}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1.5 text-2xs text-fg-muted">
            <span>
              {copy.explain.cost}{" "}
              <span className="font-mono text-fg">
                {interpolate(copy.explain.costRange, {
                  startup: formatNumber(node.startupCost),
                  total: formatNumber(node.totalCost),
                })}
              </span>
            </span>
            <span>
              {copy.explain.width} <span className="font-mono text-fg">{node.planWidth}</span>
            </span>
            {analyzed && node.actualLoops !== null ? (
              <span>
                {copy.explain.loops} <span className="font-mono text-fg">{node.actualLoops}</span>
              </span>
            ) : null}
          </div>
          <NodeDetails node={node} />
        </div>
      ) : null}
      {entry.children.length > 0 ? (
        <ul>
          {entry.children.map((child) => (
            <PlanRow
              key={child.id}
              entry={child}
              rootCost={rootCost}
              analyzed={analyzed}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function PlanView({ plan }: { plan: ExplainPlan }) {
  const indexed = useMemo(() => indexPlan(plan.root), [plan.root])
  const allIds = useMemo(() => collectIds(indexed), [indexed])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  const allOpen = expanded.size >= allIds.length
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
          <Badge tone={plan.analyzed ? "success" : "neutral"} dot>
            {plan.analyzed ? copy.explain.analyzed : copy.explain.estimated}
          </Badge>
          <span>
            {copy.explain.totalCost}{" "}
            <span className="font-mono text-fg">{formatNumber(plan.root.totalCost)}</span>
          </span>
          {plan.planningTimeMs !== null ? (
            <span>
              {copy.explain.planningTime}{" "}
              <span className="font-mono text-fg">{formatDuration(plan.planningTimeMs)}</span>
            </span>
          ) : null}
          {plan.executionTimeMs !== null ? (
            <span>
              {copy.explain.executionTime}{" "}
              <span className="font-mono text-fg">{formatDuration(plan.executionTimeMs)}</span>
            </span>
          ) : null}
          <span>{interpolate(copy.explain.nodeCount, { count: countNodes(plan.root) })}</span>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setExpanded(allOpen ? new Set() : new Set(allIds))}
        >
          {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
          {allOpen ? copy.explain.collapseAll : copy.explain.expandAll}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[760px]">
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_180px_88px_88px_88px] gap-3 border-b border-border bg-surface-2 py-1.5 pr-3 pl-8 text-2xs font-medium text-fg-muted">
            <span />
            <span>{copy.explain.cost}</span>
            <span className="text-right">{copy.explain.estimatedRows}</span>
            <span className="text-right">{copy.explain.actualRows}</span>
            <span className="text-right">{copy.explain.actualTime}</span>
          </div>
          <ul>
            <PlanRow
              entry={indexed}
              rootCost={plan.root.totalCost}
              analyzed={plan.analyzed}
              expanded={expanded}
              onToggle={toggle}
            />
          </ul>
        </div>
      </div>
    </div>
  )
}
