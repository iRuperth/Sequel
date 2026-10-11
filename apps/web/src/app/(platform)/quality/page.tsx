import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { QualityView } from "@/features/quality/components/quality-view"

export const metadata: Metadata = {
  title: copy.nav.quality,
}

export default function Page() {
  return <QualityView />
}
