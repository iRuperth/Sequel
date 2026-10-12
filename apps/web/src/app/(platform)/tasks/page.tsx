import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { TasksView } from "@/features/tasks/components/tasks-view"

export const metadata: Metadata = {
  title: copy.nav.tasks,
}

export default function Page() {
  return <TasksView />
}
