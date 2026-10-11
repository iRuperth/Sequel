import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { NotFoundView } from "@/components/layout/not-found-view"

export const metadata: Metadata = {
  title: copy.systemPages.notFound.title,
}

export default function NotFound() {
  return <NotFoundView />
}
