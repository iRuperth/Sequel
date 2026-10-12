"use client"

import { copy } from "@sequel/copy"
import { toast } from "@/components/ui/toast"
import { copyToClipboard } from "@/lib/clipboard"

export async function copySqlToClipboard(sql: string): Promise<void> {
  const ok = await copyToClipboard(sql)
  if (ok) {
    toast.success(copy.savedQueries.sqlCopied)
  } else {
    toast.error(copy.states.copyFailed)
  }
}
