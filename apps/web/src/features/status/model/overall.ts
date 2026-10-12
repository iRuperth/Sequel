import type { ServiceState, ServiceStatus } from "@sequel/contracts"

export type OverallState = "operational" | "degraded" | "down"

export function overallState(services: readonly ServiceStatus[]): OverallState {
  const states = new Set<ServiceState>(services.map((service) => service.state))
  if (states.has("down")) {
    return "down"
  }
  if (states.has("degraded")) {
    return "degraded"
  }
  return "operational"
}
