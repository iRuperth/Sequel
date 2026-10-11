export const ROUTE_PARAMS = {
  sql: "sql",
  savedQueryId: "savedQueryId",
  newTask: "new",
  newTaskValue: "1",
  tab: "tab",
} as const

export const ROUTES = {
  home: "/",
  workbench: "/workbench",
  tasks: "/tasks",
  progress: "/progress",
  catalog: "/catalog",
  history: "/history",
  savedQueries: "/saved-queries",
  dashboards: "/dashboards",
  jobs: "/jobs",
  quality: "/quality",
  settings: "/settings",
  status: "/status",
} as const

function withQuery(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString()
  return search ? `${path}?${search}` : path
}

export const routeTo = {
  task: (id: string) => `${ROUTES.tasks}/${encodeURIComponent(id)}`,
  newTask: () => withQuery(ROUTES.tasks, { [ROUTE_PARAMS.newTask]: ROUTE_PARAMS.newTaskValue }),
  workbenchWithSql: (sql: string) => withQuery(ROUTES.workbench, { [ROUTE_PARAMS.sql]: sql }),
  workbenchWithSavedQuery: (id: string) =>
    withQuery(ROUTES.workbench, { [ROUTE_PARAMS.savedQueryId]: id }),
  catalogDataset: (schema: string) => `${ROUTES.catalog}/${encodeURIComponent(schema)}`,
  catalogTable: (schema: string, table: string) =>
    `${ROUTES.catalog}/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
  dashboard: (id: string) => `${ROUTES.dashboards}/${encodeURIComponent(id)}`,
  jobsTab: (tab: string) => withQuery(ROUTES.jobs, { [ROUTE_PARAMS.tab]: tab }),
} as const
