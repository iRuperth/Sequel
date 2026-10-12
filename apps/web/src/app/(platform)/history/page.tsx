import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { HistoryView } from "@/features/history/components/history-view"

export const metadata: Metadata = {
  title: copy.nav.history,
}

export default function Page() {
  return <HistoryView />
}
