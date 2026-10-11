export const CATALOG_SKELETONS = {
  datasetCards: 6,
  searchRows: 4,
  tableRows: 8,
  tableColumns: 7,
  relationshipRows: 4,
  overviewRows: 6,
} as const

export const OVERVIEW_COLUMN_PREVIEW_LIMIT = 10

export const PROGRESS_MAX = 100

export const TABLE_TABS = {
  overview: "overview",
  columns: "columns",
  sample: "sample",
  relationships: "relationships",
} as const

export type TableTab = (typeof TABLE_TABS)[keyof typeof TABLE_TABS]
