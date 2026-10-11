"use client"

import { copy } from "@sequel/copy"
import { Plus } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ROUTE_PARAMS, routeTo } from "@/config/routes"
import { useScheduledQueries } from "../api-scheduled"
import {
  JOBS_SKELETON_COLUMNS,
  JOBS_SKELETON_ROWS,
  JOBS_TABS,
  parseJobsTab,
} from "../model/constants"
import { ActivityPanel } from "./activity/activity-panel"
import { ScheduledQueriesPanel } from "./scheduled/scheduled-queries-panel"

export function JobsView() {
  return (
    <Suspense fallback={<JobsViewFallback />}>
      <JobsViewContent />
    </Suspense>
  )
}

function JobsViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = parseJobsTab(searchParams.get(ROUTE_PARAMS.tab))
  const [createOpen, setCreateOpen] = useState(false)
  const schedules = useScheduledQueries()

  const changeTab = (value: string) => {
    router.replace(routeTo.jobsTab(parseJobsTab(value)), { scroll: false })
  }

  return (
    <PageContainer>
      <PageHeader
        title={copy.jobs.title}
        description={copy.jobs.description}
        actions={
          tab === JOBS_TABS.scheduled ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus />
              {copy.jobs.scheduled.newSchedule}
            </Button>
          ) : null
        }
      />
      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList variant="underline" aria-label={copy.jobs.tabs.label}>
          <TabsTrigger value={JOBS_TABS.scheduled} count={schedules.data?.items.length}>
            {copy.jobs.tabs.scheduled}
          </TabsTrigger>
          <TabsTrigger value={JOBS_TABS.activity}>{copy.jobs.tabs.activity}</TabsTrigger>
        </TabsList>
        <TabsContent value={JOBS_TABS.scheduled} className="pt-4">
          <ScheduledQueriesPanel createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
        </TabsContent>
        <TabsContent value={JOBS_TABS.activity} className="pt-4">
          <ActivityPanel />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

function JobsViewFallback() {
  return (
    <PageContainer>
      <PageHeader title={copy.jobs.title} description={copy.jobs.description} />
      <div className="flex flex-col gap-4">
        <div className="flex h-8 items-end gap-4 border-b border-border">
          <Skeleton className="mb-2 h-3 w-28" />
          <Skeleton className="mb-2 h-3 w-16" />
        </div>
        <SkeletonTable rows={JOBS_SKELETON_ROWS} columns={JOBS_SKELETON_COLUMNS.schedules} />
      </div>
    </PageContainer>
  )
}
