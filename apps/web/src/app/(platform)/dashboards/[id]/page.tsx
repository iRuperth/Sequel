import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { DashboardDetailView } from "@/features/dashboards/components/dashboard-detail-view"

export const metadata: Metadata = {
  title: copy.nav.dashboards,
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DashboardDetailView dashboardId={id} />
}
