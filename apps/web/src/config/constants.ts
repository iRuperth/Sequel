import { LIMITS, type Preferences } from "@sequel/contracts"

export const UI_TIMING = {
  staleTimeMs: 15_000,
  healthRefetchMs: 30_000,
  statusPageRefetchMs: 10_000,
  jobsActivityRefetchMs: 5_000,
  qualityRefetchMs: 30_000,
  draftAutosaveMs: 1_200,
  searchDebounceMs: 250,
  toastDurationMs: 4_500,
  copiedFeedbackMs: 1_500,
  queryRetryCount: 1,
} as const

export const UI_LIMITS = {
  previewRowLimit: 100,
  sessionHistoryLimit: 50,
  paletteSavedQueries: 6,
  homeRecentQueries: 6,
  homeOpenTasks: 6,
  homeSkillBars: 6,
  activityWeeks: 26,
  daysPerWeek: 7,
  maxResultColumnWidth: 420,
  minResultColumnWidth: 88,
  resultRowHeight: 26,
  resultHeaderHeight: 44,
  gridOverscan: 12,
  sampleGridMaxRows: 50,
  sqlPreviewLines: 6,
  jobsActivityLimit: 50,
  runsLimit: 50,
} as const

export const LAYOUT = {
  sidebarWidth: 232,
  sidebarCollapsedWidth: 52,
  schemaBrowserWidth: 280,
  previewSuggestions: 4,
  resultsPanelDefault: 0.42,
  resultsPanelMin: 0.15,
  resultsPanelMax: 0.85,
  dashboardRowHeight: 84,
} as const

export const STORAGE_KEYS = {
  layout: "sequel.layout",
  worksheets: "sequel.workbench.worksheets",
  sessionHistory: "sequel.workbench.history",
} as const

export const SELECT_ALL = "__all__"

export const DEFAULT_PREFERENCES: Preferences = {
  editorFontSize: 13,
  editorTabSize: 2,
  editorWordWrap: false,
  editorLineNumbers: true,
  editorAutocomplete: true,
  resultPageSize: LIMITS.resultPageSizes[2],
  defaultTrack: "data_engineer",
  llmFeedbackEnabled: true,
}
