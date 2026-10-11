"use client"

import type { Widget } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import {
  ArrowLeft,
  EllipsisVertical,
  LayoutDashboard,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCw,
  Trash,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState, InlineError } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { RelativeTime } from "@/components/ui/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { useBreadcrumbLabel } from "@/components/layout/breadcrumb-store"
import { ROUTES } from "@/config/routes"
import { ApiError } from "@/lib/api-client"
import {
  useDashboard,
  useDashboardData,
  useDeleteDashboard,
  useDeleteWidget,
  useRefreshDashboardData,
} from "../api"
import { widgetCountLabel } from "./dashboard-card"
import { DashboardFormDialog } from "./dashboard-form-dialog"
import { DashboardGrid } from "./dashboard-grid"
import { WidgetDialog } from "./widget-dialog"

const t = copy.dashboards.detail

type WidgetDialogState = { open: boolean; widget: Widget | null }

export function DashboardDetailView({ dashboardId }: { dashboardId: string }) {
  const router = useRouter()
  const dashboardQuery = useDashboard(dashboardId)
  const dashboard = dashboardQuery.data
  const dataQuery = useDashboardData(dashboardId, Boolean(dashboard))
  const refresh = useRefreshDashboardData(dashboardId)
  const deleteDashboard = useDeleteDashboard(dashboardId)
  const deleteWidget = useDeleteWidget(dashboardId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [widgetDialog, setWidgetDialog] = useState<WidgetDialogState>({ open: false, widget: null })
  const [widgetToDelete, setWidgetToDelete] = useState<Widget | null>(null)
  useBreadcrumbLabel(dashboard?.name)

  const lastRefreshed = useMemo(() => {
    const items = dataQuery.data?.items ?? []
    let latest: string | null = null
    for (const item of items) {
      if (!latest || Date.parse(item.executedAt) > Date.parse(latest)) {
        latest = item.executedAt
      }
    }
    return latest
  }, [dataQuery.data])

  if (dashboardQuery.isPending) {
    return <DashboardDetailSkeleton />
  }

  if (dashboardQuery.isError || !dashboard) {
    const notFound = dashboardQuery.error instanceof ApiError && dashboardQuery.error.isNotFound
    return (
      <PageContainer>
        <div className="rounded-md border border-border bg-surface">
          {notFound ? (
            <EmptyState
              icon={LayoutDashboard}
              title={t.notFoundTitle}
              description={t.notFoundDescription}
              action={
                <Button asChild>
                  <Link href={ROUTES.dashboards}>
                    <ArrowLeft />
                    {t.backToList}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ErrorState
              error={dashboardQuery.error}
              onRetry={() => void dashboardQuery.refetch()}
              retrying={dashboardQuery.isRefetching}
            />
          )}
        </div>
      </PageContainer>
    )
  }

  const openCreateWidget = () => setWidgetDialog({ open: true, widget: null })
  const refreshing = refresh.isPending || (dataQuery.isFetching && !dataQuery.isPending)

  const confirmDeleteDashboard = () =>
    deleteDashboard.mutate(undefined, {
      onSuccess: () => {
        toast.success(t.deleted)
        setDeleteOpen(false)
        router.push(ROUTES.dashboards)
      },
      onError: (error) => toast.fromError(error),
    })

  const confirmDeleteWidget = () => {
    if (!widgetToDelete) {
      return
    }
    deleteWidget.mutate(widgetToDelete.id, {
      onSuccess: () => {
        toast.success(copy.dashboards.widget.deleted)
        setWidgetToDelete(null)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title={dashboard.name}
        description={dashboard.description || undefined}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <LayoutGrid className="size-3.5 text-fg-subtle" />
              <span className="tabular">{widgetCountLabel(dashboard.widgets.length)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-fg-subtle">{t.lastRefreshed}</span>
              {dataQuery.isPending && dashboard.widgets.length > 0 ? (
                <Skeleton className="h-3 w-16" />
              ) : lastRefreshed ? (
                <RelativeTime value={lastRefreshed} className="text-fg" />
              ) : (
                <span>{t.notRefreshed}</span>
              )}
            </span>
          </>
        }
        actions={
          <>
            <Button
              onClick={() =>
                refresh.mutate(undefined, {
                  onError: (error) => toast.fromError(error, t.refreshFailed),
                })
              }
              loading={refreshing}
              disabled={dashboard.widgets.length === 0}
            >
              {refreshing ? null : <RefreshCw />}
              {copy.actions.refresh}
            </Button>
            <Button variant="primary" onClick={openCreateWidget}>
              <Plus />
              {copy.actions.addWidget}
            </Button>
            <DropdownMenu>
              <Tooltip content={copy.actions.more}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={copy.actions.more}>
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil />
                  {t.editDetails}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                  <Trash />
                  {t.deleteDashboard}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {dataQuery.isError && dataQuery.data === undefined && dashboard.widgets.length > 0 ? (
        <div className="mb-3 flex items-start gap-2">
          <InlineError error={dataQuery.error} className="flex-1" />
          <Button onClick={() => void dataQuery.refetch()} loading={dataQuery.isFetching}>
            {dataQuery.isFetching ? null : <RefreshCw />}
            {copy.actions.retry}
          </Button>
        </div>
      ) : null}

      {dashboard.widgets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface">
          <EmptyState
            icon={LayoutGrid}
            title={copy.dashboards.emptyWidgets.title}
            description={copy.dashboards.emptyWidgets.description}
            action={
              <Button variant="primary" onClick={openCreateWidget}>
                <Plus />
                {copy.actions.addWidget}
              </Button>
            }
          />
        </div>
      ) : (
        <DashboardGrid
          widgets={dashboard.widgets}
          data={dataQuery.data?.items}
          loading={dataQuery.isPending && !dataQuery.isError}
          error={dataQuery.error}
          onEdit={(widget) => setWidgetDialog({ open: true, widget })}
          onDelete={setWidgetToDelete}
        />
      )}

      <WidgetDialog
        open={widgetDialog.open}
        onOpenChange={(open) => setWidgetDialog((current) => ({ ...current, open }))}
        dashboardId={dashboard.id}
        widgets={dashboard.widgets}
        widget={widgetDialog.widget}
      />
      <DashboardFormDialog open={editOpen} onOpenChange={setEditOpen} dashboard={dashboard} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={interpolate(t.deleteTitle, { name: dashboard.name })}
        description={t.deleteDescription}
        confirmLabel={copy.actions.delete}
        destructive
        loading={deleteDashboard.isPending}
        onConfirm={confirmDeleteDashboard}
      />
      <ConfirmDialog
        open={widgetToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWidgetToDelete(null)
          }
        }}
        title={interpolate(copy.dashboards.widget.deleteTitle, {
          title: widgetToDelete?.title ?? "",
        })}
        description={copy.dashboards.widget.deleteDescription}
        confirmLabel={copy.actions.delete}
        destructive
        loading={deleteWidget.isPending}
        onConfirm={confirmDeleteWidget}
      />
    </PageContainer>
  )
}

function DashboardDetailSkeleton() {
  return (
    <PageContainer width="wide">
      <div className="flex flex-col gap-2 pb-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
        <Skeleton className="mt-1 h-3 w-40" />
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-40 rounded-md" />
        <Skeleton className="h-72 rounded-md lg:col-span-2" />
        <Skeleton className="h-72 rounded-md lg:col-span-2" />
      </div>
    </PageContainer>
  )
}
