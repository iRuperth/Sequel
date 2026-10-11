"use client"

import type { TaskSummary } from "@sequel/contracts"
import { copy, interpolate, topicLabels, trackLabels } from "@sequel/copy"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { routeTo } from "@/config/routes"
import { TOPIC_PREVIEW_COUNT } from "../model/constants"
import { DifficultyBadge, TaskStatusBadge } from "./task-badges"

function TopicList({ topics }: { topics: TaskSummary["topics"] }) {
  const visible = topics.slice(0, TOPIC_PREVIEW_COUNT)
  const hidden = topics.slice(TOPIC_PREVIEW_COUNT)
  if (topics.length === 0) {
    return <span className="text-fg-subtle">{copy.common.notAvailable}</span>
  }
  return (
    <div className="flex items-center gap-1">
      {visible.map((topic) => (
        <Badge key={topic} variant="outline" className="max-w-40 truncate">
          {topicLabels[topic]}
        </Badge>
      ))}
      {hidden.length > 0 ? (
        <Tooltip content={hidden.map((topic) => topicLabels[topic]).join(", ")}>
          <span className="cursor-default font-mono text-2xs text-fg-muted tabular">
            {interpolate(copy.tasks.list.moreTopics, { count: hidden.length })}
          </span>
        </Tooltip>
      ) : null}
    </div>
  )
}

function TaskRow({ task }: { task: TaskSummary }) {
  const router = useRouter()
  const href = routeTo.task(task.id)
  const open = () => router.push(href)
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter") {
      open()
    }
  }
  return (
    <TableRow
      interactive
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      aria-label={interpolate(copy.tasks.list.openTicket, { key: task.ticketKey })}
      className="focus-visible:bg-surface-2/70 focus-visible:outline-none"
    >
      <TableCell className="w-px font-mono text-xs whitespace-nowrap text-fg-muted">
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          tabIndex={-1}
          className="hover:text-fg"
        >
          {task.ticketKey}
        </Link>
      </TableCell>
      <TableCell className="w-full max-w-0 py-1.5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-fg">{task.title}</span>
          {task.stakeholder ? (
            <span className="truncate text-xs text-fg-muted">{task.stakeholder.team}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap text-fg-muted">
        {trackLabels[task.track]}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <DifficultyBadge difficulty={task.difficulty} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <TopicList topics={task.topics} />
      </TableCell>
      <TableCell className="max-w-44 truncate font-mono text-xs text-fg-muted">
        {task.datasetSlugs.length > 0 ? task.datasetSlugs.join(", ") : copy.common.notAvailable}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <TaskStatusBadge status={task.status} />
      </TableCell>
      <TableCell className="text-right text-xs whitespace-nowrap text-fg-muted">
        <RelativeTime value={task.createdAt} />
      </TableCell>
    </TableRow>
  )
}

export function TaskTable({ tasks }: { tasks: readonly TaskSummary[] }) {
  const columns = copy.tasks.list.columns
  return (
    <TableContainer>
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow>
            <TableHead>{columns.key}</TableHead>
            <TableHead>{columns.title}</TableHead>
            <TableHead>{columns.track}</TableHead>
            <TableHead>{columns.difficulty}</TableHead>
            <TableHead>{columns.topics}</TableHead>
            <TableHead>{columns.datasets}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead className="text-right">{columns.created}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
