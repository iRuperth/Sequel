import { copy } from "@sequel/copy"
import type { Metadata } from "next"
import { TaskDetailView } from "@/features/tasks/components/task-detail-view"

export const metadata: Metadata = {
  title: copy.nav.tasks,
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TaskDetailView taskId={id} />
}
