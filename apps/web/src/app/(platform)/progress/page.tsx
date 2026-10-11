import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { ProgressView } from "@/features/progress/components/progress-view"

export const metadata: Metadata = {
  title: copy.nav.progress,
}

export default function Page() {
  return <ProgressView />
}
