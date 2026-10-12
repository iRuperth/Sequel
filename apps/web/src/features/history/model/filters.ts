import type { ExecutionSource, ExecutionStatus } from "@sequel/contracts"
import { LIMITS } from "@sequel/contracts"
import { SELECT_ALL } from "@/config/constants"
import type { HistoryFilters } from "../api"

export type StatusFilter = ExecutionStatus | typeof SELECT_ALL
export type SourceFilter = ExecutionSource | typeof SELECT_ALL

export function buildHistoryFilters(
  status: StatusFilter,
  source: SourceFilter,
  search: string,
): HistoryFilters {
  return {
    limit: LIMITS.historyPageSizeDefault,
    status: status === SELECT_ALL ? undefined : status,
    source: source === SELECT_ALL ? undefined : source,
    search: search || undefined,
  }
}
