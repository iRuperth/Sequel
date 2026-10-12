import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { DatasetView } from "@/features/catalog/components/dataset-view"
import { safeDecode } from "@/lib/url"

export const metadata: Metadata = {
  title: copy.nav.catalog,
}

export default async function Page({ params }: { params: Promise<{ schema: string }> }) {
  const { schema } = await params
  return <DatasetView schema={safeDecode(schema)} />
}
