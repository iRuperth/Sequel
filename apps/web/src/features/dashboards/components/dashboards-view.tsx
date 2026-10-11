"use client"

import { copy } from "@sequel/copy"
import { LayoutDashboard, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { routeTo } from "@/config/routes"
import { useDashboards } from "../api"
import { DASHBOARD_SKELETON_CARDS } from "../model/constants"
import { DashboardCard, DashboardCardSkeleton } from "./dashboard-card"
import { DashboardFormDialog } from "./dashboard-form-dialog"

const GRID_CLASS = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"

export function DashboardsView() {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const dashboards = useDashboards()
  const items = dashboards.data?.items ?? []
  const createButton = (
    <Button variant="primary" onClick={() => setCreateOpen(true)}>
      <Plus />
      {copy.dashboards.newDashboard}
    </Button>
  )
  return (
    <PageContainer>
      <PageHeader
        title={copy.dashboards.title}
        description={copy.dashboards.description}
        actions={createButton}
      />
      {dashboards.isPending ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: DASHBOARD_SKELETON_CARDS }, (_, index) => (
            <DashboardCardSkeleton key={index} />
          ))}
        </div>
      ) : dashboards.isError ? (
        <div className="rounded-md border border-border bg-surface">
          <ErrorState
            error={dashboards.error}
            onRetry={() => void dashboards.refetch()}
            retrying={dashboards.isRefetching}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface">
          <EmptyState
            icon={LayoutDashboard}
            title={copy.dashboards.empty.title}
            description={copy.dashboards.empty.description}
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus />
                {copy.dashboards.empty.action}
              </Button>
            }
          />
        </div>
      ) : (
        <div className={GRID_CLASS}>
          {items.map((dashboard) => (
            <DashboardCard key={dashboard.id} dashboard={dashboard} />
          ))}
        </div>
      )}
      <DashboardFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(dashboard) => router.push(routeTo.dashboard(dashboard.id))}
      />
    </PageContainer>
  )
}
