import type {
  QualityCheck,
  QualityCheckConfig,
  QualityCheckKind,
  Severity,
  UpsertQualityCheckRequest,
} from "@sequel/contracts"
import { copy, interpolate, qualityMessages } from "@sequel/copy"
import { normalizeCron } from "@/features/jobs/model/cron-presets"
import { formatNumber } from "@/lib/format"
import { COLUMN_REQUIRED_KINDS, DEFAULT_CHECK_KIND, DEFAULT_SEVERITY } from "./constants"

const t = copy.quality.form

export type CheckFormState = {
  name: string
  description: string
  kind: QualityCheckKind
  targetSchema: string
  targetTable: string
  targetColumn: string
  min: string
  max: string
  maxAgeHours: string
  acceptedValues: string
  sql: string
  severity: Severity
  isEnabled: boolean
  cronExpression: string
}

export type CheckFormErrors = Partial<
  Record<
    "name" | "target" | "targetColumn" | "range" | "maxAgeHours" | "acceptedValues" | "sql",
    string
  >
>

export function requiresColumn(kind: QualityCheckKind): boolean {
  return COLUMN_REQUIRED_KINDS.includes(kind)
}

function numberText(value: number | null): string {
  return value === null ? "" : String(value)
}

export function initialCheckForm(check: QualityCheck | null): CheckFormState {
  if (check) {
    return {
      name: check.name,
      description: check.description ?? "",
      kind: check.kind,
      targetSchema: check.targetSchema,
      targetTable: check.targetTable,
      targetColumn: check.targetColumn ?? "",
      min: numberText(check.config.min),
      max: numberText(check.config.max),
      maxAgeHours: numberText(check.config.maxAgeHours),
      acceptedValues: check.config.acceptedValues.join(", "),
      sql: check.config.sql ?? "",
      severity: check.severity,
      isEnabled: check.isEnabled,
      cronExpression: check.cronExpression ?? "",
    }
  }
  return {
    name: "",
    description: "",
    kind: DEFAULT_CHECK_KIND,
    targetSchema: "",
    targetTable: "",
    targetColumn: "",
    min: "",
    max: "",
    maxAgeHours: "",
    acceptedValues: "",
    sql: "",
    severity: DEFAULT_SEVERITY,
    isEnabled: true,
    cronExpression: "",
  }
}

function parseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function isInvalidNumber(text: string): boolean {
  return text.trim() !== "" && parseNumber(text) === null
}

export function parseValueList(text: string): string[] {
  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

export function validateCheckForm(state: CheckFormState): CheckFormErrors {
  const errors: CheckFormErrors = {}
  if (!state.name.trim()) {
    errors.name = t.nameRequired
  }
  if (!state.targetSchema.trim() || !state.targetTable.trim()) {
    errors.target = t.targetRequired
  }
  if (requiresColumn(state.kind) && !state.targetColumn.trim()) {
    errors.targetColumn = t.columnRequired
  }
  if (state.kind === "row_count_between") {
    const min = parseNumber(state.min)
    const max = parseNumber(state.max)
    if (
      isInvalidNumber(state.min) ||
      isInvalidNumber(state.max) ||
      (min === null && max === null)
    ) {
      errors.range = t.rangeRequired
    } else if (min !== null && max !== null && min > max) {
      errors.range = t.rangeInvalid
    }
  }
  if (state.kind === "freshness" && parseNumber(state.maxAgeHours) === null) {
    errors.maxAgeHours = t.maxAgeRequired
  }
  if (state.kind === "accepted_values" && parseValueList(state.acceptedValues).length === 0) {
    errors.acceptedValues = t.acceptedValuesRequired
  }
  if (state.kind === "custom_sql" && !state.sql.trim()) {
    errors.sql = t.sqlRequired
  }
  return errors
}

export function buildCheckConfig(state: CheckFormState): QualityCheckConfig {
  return {
    min: state.kind === "row_count_between" ? parseNumber(state.min) : null,
    max: state.kind === "row_count_between" ? parseNumber(state.max) : null,
    maxAgeHours: state.kind === "freshness" ? parseNumber(state.maxAgeHours) : null,
    acceptedValues: state.kind === "accepted_values" ? parseValueList(state.acceptedValues) : [],
    sql: state.kind === "custom_sql" ? state.sql.trim() || null : null,
  }
}

export function toCheckRequest(state: CheckFormState): UpsertQualityCheckRequest {
  const cron = state.cronExpression.trim()
  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    kind: state.kind,
    targetSchema: state.targetSchema.trim(),
    targetTable: state.targetTable.trim(),
    targetColumn: state.targetColumn.trim() || null,
    config: buildCheckConfig(state),
    severity: state.severity,
    isEnabled: state.isEnabled,
    cronExpression: cron ? normalizeCron(cron) : null,
  }
}

export function toUpsertCheckBody(
  check: QualityCheck,
  overrides: Partial<UpsertQualityCheckRequest> = {},
): UpsertQualityCheckRequest {
  return {
    name: check.name,
    description: check.description,
    kind: check.kind,
    targetSchema: check.targetSchema,
    targetTable: check.targetTable,
    targetColumn: check.targetColumn,
    config: check.config,
    severity: check.severity,
    isEnabled: check.isEnabled,
    cronExpression: check.cronExpression,
    ...overrides,
  }
}

export function checkTarget(
  check: Pick<QualityCheck, "targetSchema" | "targetTable" | "targetColumn">,
): string {
  return [check.targetSchema, check.targetTable, check.targetColumn].filter(Boolean).join(".")
}

export function describeExpectation(state: CheckFormState): string | null {
  const template = qualityMessages.expectations[state.kind]
  const column = state.targetColumn.trim()
  switch (state.kind) {
    case "not_null":
    case "unique":
    case "accepted_values":
      return column ? interpolate(template, { column }) : null
    case "freshness": {
      const hours = parseNumber(state.maxAgeHours)
      return column && hours !== null
        ? interpolate(template, { column, hours: formatNumber(hours) })
        : null
    }
    case "row_count_between": {
      const min = parseNumber(state.min)
      const max = parseNumber(state.max)
      return min !== null && max !== null
        ? interpolate(template, { min: formatNumber(min), max: formatNumber(max) })
        : null
    }
    case "custom_sql":
      return template
  }
}
