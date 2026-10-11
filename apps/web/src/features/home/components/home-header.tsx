"use client"

import { copy, interpolate } from "@sequel/copy"
import { BookOpen, Plus, SquareTerminal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES, routeTo } from "@/config/routes"
import { useCurrentUser } from "@/features/settings/api"
import { useWorksheetStore } from "@/features/workbench/model/worksheets-store"
import { formatDate } from "@/lib/format"
import { useMounted } from "@/lib/hooks/use-platform"
import { greeting } from "../model/greeting"

function HomeActions() {
  const router = useRouter()
  const openNewQuery = () => {
    useWorksheetStore.getState().createWorksheet()
    router.push(ROUTES.workbench)
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="primary" onClick={openNewQuery}>
        <SquareTerminal />
        {copy.home.actions.newQuery}
      </Button>
      <Button asChild>
        <Link href={routeTo.newTask()}>
          <Plus />
          {copy.home.actions.newTask}
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={ROUTES.catalog}>
          <BookOpen />
          {copy.home.actions.browseCatalog}
        </Link>
      </Button>
    </div>
  )
}

export function HomeHeader() {
  const mounted = useMounted()
  const user = useCurrentUser()
  const ready = mounted && !user.isPending
  const now = new Date()
  const role = user.data?.roleTitle ?? copy.shell.user.fallbackRole
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
      <div className="flex min-w-0 flex-col gap-1">
        {ready ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-fg">
              {greeting(now.getHours())}
            </h1>
            <p className="text-sm text-fg-muted">
              {interpolate(copy.home.subtitle, { role, date: formatDate(now, "date") })}
            </p>
          </>
        ) : (
          <>
            <h1 className="sr-only">{copy.home.title}</h1>
            <Skeleton className="h-[26px] w-72" />
            <Skeleton className="h-[18px] w-56" />
          </>
        )}
      </div>
      <HomeActions />
    </header>
  )
}
