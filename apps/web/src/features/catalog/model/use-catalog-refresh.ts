"use client"

import type { JobSnapshot } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { useCallback, useState } from "react"
import { toast } from "@/components/ui/toast"
import { useJob } from "@/features/jobs/model/use-job"
import { useRefreshCatalog } from "../api"

export function useCatalogRefresh() {
  const [jobId, setJobId] = useState<string | null>(null)
  const { mutate, isPending } = useRefreshCatalog()
  const onSettled = useCallback((snapshot: JobSnapshot) => {
    if (snapshot.status === "succeeded") {
      toast.success(copy.catalog.refresh.succeeded, copy.catalog.refresh.succeededDescription)
    } else {
      toast.error(copy.catalog.refresh.failed, snapshot.error)
    }
    setJobId(null)
  }, [])
  const job = useJob(jobId, { onSettled })
  const start = useCallback(() => {
    mutate(undefined, {
      onSuccess: (result) => setJobId(result.jobId),
      onError: (error) => toast.fromError(error, copy.catalog.refresh.failed),
    })
  }, [mutate])
  return {
    start,
    running: isPending || job.isRunning,
    snapshot: jobId ? job.snapshot : null,
  }
}
