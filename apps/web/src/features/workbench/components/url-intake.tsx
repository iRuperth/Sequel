"use client"

import { savedQuerySchema, API_ROUTES } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { toast } from "@/components/ui/toast"
import { ROUTE_PARAMS, ROUTES } from "@/config/routes"
import { savedQueryKeys } from "@/features/saved-queries/api"
import { api } from "@/lib/api-client"
import { useWorksheetStore } from "../model/worksheets-store"

export function UrlIntake() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const handledRef = useRef<string | null>(null)
  const sql = searchParams.get(ROUTE_PARAMS.sql)
  const savedQueryId = searchParams.get(ROUTE_PARAMS.savedQueryId)

  useEffect(() => {
    const signature = `${sql ?? ""}|${savedQueryId ?? ""}`
    if ((!sql && !savedQueryId) || handledRef.current === signature) {
      return
    }
    handledRef.current = signature
    const store = useWorksheetStore.getState()
    if (sql) {
      store.createWorksheet({ sql })
      toast.info(copy.workbench.notices.openedFromLink)
      router.replace(ROUTES.workbench)
      return
    }
    if (savedQueryId) {
      const existing = store.worksheets.find((worksheet) => worksheet.savedQueryId === savedQueryId)
      if (existing) {
        store.setActive(existing.id)
        router.replace(ROUTES.workbench)
        return
      }
      queryClient
        .fetchQuery({
          queryKey: savedQueryKeys.detail(savedQueryId),
          queryFn: ({ signal }) =>
            api.get(
              API_ROUTES.savedQueries.item.build({ id: savedQueryId }),
              savedQuerySchema,
              undefined,
              signal,
            ),
        })
        .then((saved) => {
          useWorksheetStore.getState().createWorksheet({
            title: saved.name,
            sql: saved.sqlText,
            savedQueryId: saved.id,
            savedSql: saved.sqlText,
          })
        })
        .catch((error: unknown) => {
          toast.fromError(error, copy.workbench.notices.savedQueryMissing)
        })
        .finally(() => {
          router.replace(ROUTES.workbench)
        })
    }
  }, [sql, savedQueryId, router, queryClient])

  return null
}
