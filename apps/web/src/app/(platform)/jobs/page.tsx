import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { JobsView } from "@/features/jobs/components/jobs-view"

export const metadata: Metadata = {
  title: copy.nav.jobs,
}

export default function Page() {
  return <JobsView />
}
