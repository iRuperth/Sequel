"use client"

import { ErrorView } from "@/components/layout/error-view"

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorView digest={error.digest} onRetry={reset} />
}
