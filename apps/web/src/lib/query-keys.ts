export const QUERY_ROOTS = {
  me: "me",
  health: "health",
  schema: "schema",
  queries: "queries",
  history: "history",
  savedQueries: "saved-queries",
  catalog: "catalog",
  sandbox: "sandbox",
  tasks: "tasks",
  jobs: "jobs",
  progress: "progress",
  dashboards: "dashboards",
  scheduledQueries: "scheduled-queries",
  qualityChecks: "quality-checks",
  settings: "settings",
} as const

export type QueryRoot = (typeof QUERY_ROOTS)[keyof typeof QUERY_ROOTS]
