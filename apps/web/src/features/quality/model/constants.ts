import type { QualityCheckKind, Severity } from "@sequel/contracts"
import type { CronPresetId } from "@/features/jobs/model/cron-presets"

export const COLUMN_REQUIRED_KINDS: readonly QualityCheckKind[] = [
  "not_null",
  "unique",
  "freshness",
  "accepted_values",
]

export const DEFAULT_CHECK_KIND: QualityCheckKind = "not_null"
export const DEFAULT_SEVERITY: Severity = "medium"
export const NO_COLUMN = "__none__"
export const NEVER_RUN_FILTER = "never"
export const QUALITY_CRON_PRESETS: readonly CronPresetId[] = ["hourly", "dailyAt6", "weekdaysAt8"]
export const QUALITY_SKELETON_ROWS = 6
export const QUALITY_SKELETON_COLUMNS = {
  checks: 8,
  runs: 5,
} as const
export const RUN_STRIP_LIMIT = 30
