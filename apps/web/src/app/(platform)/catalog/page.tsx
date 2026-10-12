import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { CatalogView } from "@/features/catalog/components/catalog-view"

export const metadata: Metadata = {
  title: copy.nav.catalog,
}

export default function Page() {
  return <CatalogView />
}
