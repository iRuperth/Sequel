"use client"

import { ErrorView } from "@/components/layout/error-view"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorView standalone digest={error.digest} onRetry={reset} />
}
