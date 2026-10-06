type ParamsOf<TPattern extends string> = TPattern extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ParamsOf<`/${Rest}`>]: string | number }
  : TPattern extends `${string}:${infer Param}`
    ? { [K in Param]: string | number }
    : Record<string, never>

export type ApiRoute<TPattern extends string> = {
  pattern: TPattern
  build: (params?: ParamsOf<TPattern>) => string
}

function route<const TPattern extends string>(pattern: TPattern): ApiRoute<TPattern> {
  return {
    pattern,
    build: (params) =>
      pattern.replace(/:([A-Za-z]+)/g, (_match, key: string) => {
        const value = (params as Record<string, string | number> | undefined)?.[key]
        if (value === undefined) {
          throw new Error(`Missing route parameter "${key}" for ${pattern}`)
        }
        return encodeURIComponent(String(value))
      }),
  }
}

export const API_ROUTES = {
  health: {
    liveness: route("/health"),
    services: route("/health/services"),
  },
  me: route("/me"),
  schema: route("/schema"),
  queries: {
    execute: route("/queries/execute"),
    explain: route("/queries/explain"),
    cancel: route("/queries/cancel"),
    history: route("/queries/history"),
    historyDetail: route("/queries/history/:id"),
  },
  savedQueries: {
    collection: route("/saved-queries"),
    item: route("/saved-queries/:id"),
  },
  catalog: {
    datasets: route("/catalog/datasets"),
    dataset: route("/catalog/datasets/:slug"),
    table: route("/catalog/tables/:schema/:table"),
    search: route("/catalog/search"),
    refresh: route("/catalog/refresh"),
  },
  sandbox: {
    session: route("/sandbox/session"),
    reset: route("/sandbox/session/reset"),
  },
  tasks: {
    collection: route("/tasks"),
    generate: route("/tasks/generate"),
    item: route("/tasks/:id"),
    draft: route("/tasks/:id/draft"),
    submissions: route("/tasks/:id/submissions"),
    revealHint: route("/tasks/:id/hints/:position/reveal"),
    abandon: route("/tasks/:id/abandon"),
    retry: route("/tasks/:id/retry"),
    feedback: route("/tasks/:id/submissions/:submissionId/feedback"),
  },
  jobs: {
    collection: route("/jobs"),
    item: route("/jobs/:id"),
    events: route("/jobs/:id/events"),
  },
  progress: {
    summary: route("/progress/summary"),
    skills: route("/progress/skills"),
    activity: route("/progress/activity"),
  },
  dashboards: {
    collection: route("/dashboards"),
    item: route("/dashboards/:id"),
    data: route("/dashboards/:id/data"),
    widgets: route("/dashboards/:id/widgets"),
    widget: route("/dashboards/:id/widgets/:widgetId"),
  },
  scheduledQueries: {
    collection: route("/scheduled-queries"),
    item: route("/scheduled-queries/:id"),
    run: route("/scheduled-queries/:id/run"),
    runs: route("/scheduled-queries/:id/runs"),
  },
  qualityChecks: {
    collection: route("/quality-checks"),
    overview: route("/quality-checks/overview"),
    item: route("/quality-checks/:id"),
    run: route("/quality-checks/:id/run"),
    runs: route("/quality-checks/:id/runs"),
  },
  settings: {
    preferences: route("/settings/preferences"),
    llm: route("/settings/llm"),
  },
} as const
