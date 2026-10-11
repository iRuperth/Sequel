import { LIMITS } from "@sequel/contracts"

export const TASK_PAGE_SIZE = LIMITS.pageSizeDefault
export const TOPIC_PREVIEW_COUNT = 1
export const TASK_SKELETON_ROWS = 8
export const TASK_SKELETON_COLUMNS = 8
export const ELAPSED_TICK_MS = 1_000
export const MS_PER_SECOND = 1_000
export const SUBMISSION_SAMPLE_MAX_HEIGHT = "max-h-56"
export const REFERENCE_SQL_MAX_HEIGHT = "max-h-72"
export const SUGGESTED_SQL_MAX_HEIGHT = "max-h-64"
export const RECOMMENDED_DIFFICULTY = "recommended"
export const RESULT_TAB = {
  results: "results",
  grading: "grading",
  submissions: "submissions",
} as const

export type ResultTab = (typeof RESULT_TAB)[keyof typeof RESULT_TAB]
