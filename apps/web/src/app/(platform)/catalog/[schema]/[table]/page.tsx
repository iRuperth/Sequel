import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { TableView } from "@/features/catalog/components/table-view"
import { safeDecode } from "@/lib/url"

export const metadata: Metadata = {
  title: copy.nav.catalog,
}

export default async function Page({
  params,
}: {
  params: Promise<{ schema: string; table: string }>
}) {
  const { schema, table } = await params
  return <TableView schema={safeDecode(schema)} table={safeDecode(table)} />
}
