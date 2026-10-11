import { QueryClient } from "@tanstack/react-query"
import { UI_TIMING } from "@/config/constants"
import { ApiError } from "./api-client"

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.kind !== "network") {
    return false
  }
  return failureCount < UI_TIMING.queryRetryCount
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: UI_TIMING.staleTimeMs,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
