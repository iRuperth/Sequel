import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { StatusView } from "@/features/status/components/status-view"

export const metadata: Metadata = {
  title: copy.nav.status,
}

export default function Page() {
  return <StatusView />
}
