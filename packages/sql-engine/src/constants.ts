export const SCRATCH_SCHEMA_PREFIX = "scratch_"
export const GRADE_SCHEMA_PREFIX = "grade_"
export const PRIVATE_SCHEMA_PREFIXES = [SCRATCH_SCHEMA_PREFIX, GRADE_SCHEMA_PREFIX] as const

export const SQLSTATE = {
  queryCanceled: "57014",
  insufficientPrivilege: "42501",
  readOnlyTransaction: "25006",
  syntaxError: "42601",
  undefinedTable: "42P01",
} as const

export const PG_TYPE_OIDS = {
  bool: 16,
  int2: 21,
  int4: 23,
  oid: 26,
  float4: 700,
  float8: 701,
} as const

export const NUMERIC_TYPE_NAMES = new Set([
  "smallint",
  "integer",
  "bigint",
  "numeric",
  "real",
  "double precision",
  "money",
  "oid",
])

export const CELL_TRUNCATION_SUFFIX = "…"
