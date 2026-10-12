"use client"

import { copy } from "@sequel/copy"
import { ArrowLeft, TicketX } from "lucide-react"
import Link from "next/link"
import { useBreadcrumbLabel } from "@/components/layout/breadcrumb-store"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton"
import { ROUTES } from "@/config/routes"
import { ApiError } from "@/lib/api-client"
import { safeDecode } from "@/lib/url"
import { useTask } from "../api"
import { GenerationFailedPanel, GenerationPanel } from "./generation-panel"
import { TaskHeader } from "./task-header"
import { TaskWorkspace } from "./task-workspace"
import { TicketPanel } from "./ticket-panel"

const DETAIL_SKELETON_ROWS = 6

function isMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.isNotFound || error.code === "validation_failed")
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col lg:h-full">
      <div className="flex flex-col gap-2 border-b border-border bg-surface px-5 pt-3.5 pb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-3 w-2/5" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex flex-col gap-4 px-5 py-5 lg:w-2/5 lg:border-r lg:border-border">
          <Skeleton className="h-3 w-24" />
          <SkeletonRows rows={DETAIL_SKELETON_ROWS} rowClassName="h-4" />
        </div>
        <div className="flex min-h-96 flex-1 flex-col gap-3 p-3">
          <Skeleton className="h-1/2 min-h-48 w-full rounded-md" />
          <Skeleton className="min-h-32 w-full flex-1 rounded-md" />
        </div>
      </div>
    </div>
  )
}

function BackToTasks() {
  return (
    <Button asChild>
      <Link href={ROUTES.tasks}>
        <ArrowLeft />
        {copy.tasks.detail.backToTasks}
      </Link>
    </Button>
  )
}

export function TaskDetailView({ taskId }: { taskId: string }) {
  const id = safeDecode(taskId)
  const query = useTask(id)
  const task = query.data
  useBreadcrumbLabel(task?.ticketKey)

  if (query.isPending) {
    return <DetailSkeleton />
  }
  if (query.isError && !task) {
    if (isMissing(query.error)) {
      return (
        <EmptyState
          icon={TicketX}
          title={copy.tasks.detail.notFoundTitle}
          description={copy.tasks.detail.notFoundDescription}
          action={<BackToTasks />}
          className="h-full"
        />
      )
    }
    return (
      <ErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isRefetching}
        className="h-full"
      />
    )
  }
  if (!task) {
    return <DetailSkeleton />
  }

  const renderWorkArea = () => {
    if (task.status === "generating") {
      return <GenerationPanel task={task} />
    }
    if (task.status === "failed_generation") {
      return <GenerationFailedPanel task={task} />
    }
    return <TaskWorkspace key={task.id} task={task} />
  }

  return (
    <div className="flex flex-col lg:h-full">
      <TaskHeader task={task} />
      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <aside
          aria-label={copy.tasks.ticket.panelLabel}
          className="border-b border-border lg:w-2/5 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          <div className="px-5 py-5">
            <TicketPanel task={task} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-background lg:min-h-0">
          {renderWorkArea()}
        </div>
      </div>
    </div>
  )
}
