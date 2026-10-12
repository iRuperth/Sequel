export const DEFAULT_TIMEZONE = "UTC"

export const JOBS_TABS = {
  scheduled: "scheduled",
  activity: "activity",
} as const

export type JobsTab = (typeof JOBS_TABS)[keyof typeof JOBS_TABS]

export const DEFAULT_JOBS_TAB: JobsTab = JOBS_TABS.scheduled

export function parseJobsTab(value: string | null): JobsTab {
  return value === JOBS_TABS.activity ? JOBS_TABS.activity : DEFAULT_JOBS_TAB
}

export const PERCENT_SCALE = 100
export const JOBS_SKELETON_ROWS = 6

export const JOBS_SKELETON_COLUMNS = {
  schedules: 7,
  runs: 6,
  activity: 8,
} as const
