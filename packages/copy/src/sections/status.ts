export const statusCopy = {
  title: "Platform status",
  description: "Health of the services that power this workspace.",
  autoRefresh: "Auto refresh",
  autoRefreshHint: "Refresh every {seconds} seconds",
  checking: "Checking services",
  overall: {
    operational: "All systems operational",
    degraded: "Some services are degraded",
    down: "Service disruption",
  },
  summary: "{healthy} of {total} services operational",
  meta: {
    environment: "Environment",
    apiVersion: "API version",
    webVersion: "Web client",
    uptime: "Uptime",
    checkedAt: "Checked at",
  },
  unreachable: {
    title: "API unreachable",
    description:
      "The web client could not reach the API. Services below show the last known state.",
    noData: "The web client could not reach the API. Check that the API service is running.",
  },
  services: {
    title: "Services",
    description: "Each dependency is probed on every check.",
    columns: {
      service: "Service",
      state: "State",
      latency: "Latency",
      detail: "Detail",
    },
    emptyTitle: "No services reported",
    emptyDescription: "The API did not report any service checks.",
  },
} as const
