import type { ServiceStatus } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import type { Tone } from "@/lib/tones"
import type { OverallState } from "./overall"

export const OVERALL_TONE: Record<OverallState, Tone> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
}

export const OVERALL_LABEL: Record<OverallState, string> = {
  operational: copy.status.overall.operational,
  degraded: copy.status.overall.degraded,
  down: copy.status.overall.down,
}

export const OVERALL_BANNER_CLASS: Record<OverallState | "unreachable", string> = {
  operational: "bg-success/10",
  degraded: "bg-warning/10",
  down: "bg-danger/10",
  unreachable: "bg-danger/10",
}

export function healthyServiceCount(services: readonly ServiceStatus[]): number {
  return services.filter((service) => service.state === "operational").length
}
