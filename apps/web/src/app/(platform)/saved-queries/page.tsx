import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { SavedQueriesView } from "@/features/saved-queries/components/saved-queries-view"

export const metadata: Metadata = {
  title: copy.nav.savedQueries,
}

export default function Page() {
  return <SavedQueriesView />
}
