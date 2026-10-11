import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { WorkbenchView } from "@/features/workbench/components/workbench-view"

export const metadata: Metadata = {
  title: copy.nav.workbench,
}

export default function Page() {
  return <WorkbenchView />
}
