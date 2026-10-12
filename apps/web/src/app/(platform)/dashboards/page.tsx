import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { DashboardsView } from "@/features/dashboards/components/dashboards-view"

export const metadata: Metadata = {
  title: copy.nav.dashboards,
}

export default function Page() {
  return <DashboardsView />
}
