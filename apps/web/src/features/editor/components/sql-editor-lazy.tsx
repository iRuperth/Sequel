"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2.5 bg-[var(--cm-background)] px-12 py-3">
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  )
}

export const LazySqlEditor = dynamic(
  () => import("./sql-editor").then((module) => module.SqlEditor),
  {
    ssr: false,
    loading: EditorSkeleton,
  },
)
