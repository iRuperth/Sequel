export const NO_DATASET = "__none__"

export const SAVED_QUERY_SCOPES = {
  all: "all",
  favourites: "favourites",
} as const

export type SavedQueryScope = (typeof SAVED_QUERY_SCOPES)[keyof typeof SAVED_QUERY_SCOPES]

export const SAVED_QUERIES_SKELETON = {
  rows: 8,
  columns: 6,
  detailRows: 4,
} as const

export const VISIBLE_TAGS_PER_ROW = 3

export const DESCRIPTION_INPUT_ROWS = 3
