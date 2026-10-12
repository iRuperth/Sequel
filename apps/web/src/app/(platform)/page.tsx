import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { HomeView } from "@/features/home/components/home-view"

export const metadata: Metadata = {
  title: copy.nav.home,
}

export default function Page() {
  return <HomeView />
}
