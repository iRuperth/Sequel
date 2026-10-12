import { z } from "zod"

export const EXECUTION_MODES = ["read", "scratch", "explain", "grade"] as const
export const executionModeSchema = z.enum(EXECUTION_MODES)
export type ExecutionMode = z.infer<typeof executionModeSchema>

export const INTERACTIVE_EXECUTION_MODES = ["read", "scratch"] as const
export const interactiveExecutionModeSchema = z.enum(INTERACTIVE_EXECUTION_MODES)
export type InteractiveExecutionMode = z.infer<typeof interactiveExecutionModeSchema>

export const EXECUTION_STATUSES = [
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
  "rejected",
] as const
export const executionStatusSchema = z.enum(EXECUTION_STATUSES)
export type ExecutionStatus = z.infer<typeof executionStatusSchema>

export const EXECUTION_SOURCES = ["workbench", "task", "scheduled", "dashboard", "quality"] as const
export const executionSourceSchema = z.enum(EXECUTION_SOURCES)
export type ExecutionSource = z.infer<typeof executionSourceSchema>

export const REJECTION_REASONS = [
  "empty_query",
  "syntax_error",
  "multiple_statements",
  "too_many_statements",
  "statement_not_allowed",
  "function_not_allowed",
  "schema_not_allowed",
  "data_modifying_cte",
  "scratch_session_required",
] as const
export const rejectionReasonSchema = z.enum(REJECTION_REASONS)
export type RejectionReason = z.infer<typeof rejectionReasonSchema>

export const TRACKS = ["data_analyst", "data_engineer", "data_scientist"] as const
export const trackSchema = z.enum(TRACKS)
export type Track = z.infer<typeof trackSchema>

export const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const
export const difficultySchema = z.enum(DIFFICULTIES)
export type Difficulty = z.infer<typeof difficultySchema>

export const TOPICS = [
  "select_basics",
  "filtering",
  "sorting_limiting",
  "aggregation",
  "joins",
  "subqueries",
  "ctes",
  "window_functions",
  "date_time",
  "string_functions",
  "conditional_logic",
  "set_operations",
  "null_handling",
  "data_modelling_ddl",
  "dml",
  "query_optimisation",
  "data_quality",
  "analytics_patterns",
] as const
export const topicSchema = z.enum(TOPICS)
export type Topic = z.infer<typeof topicSchema>

export const TASK_MODES = ["read", "scratch"] as const
export const taskModeSchema = z.enum(TASK_MODES)
export type TaskMode = z.infer<typeof taskModeSchema>

export const TASK_STATUSES = [
  "generating",
  "open",
  "in_progress",
  "solved",
  "abandoned",
  "failed_generation",
] as const
export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const TASK_SOURCES = ["starter", "generated"] as const
export const taskSourceSchema = z.enum(TASK_SOURCES)
export type TaskSource = z.infer<typeof taskSourceSchema>

export const VERDICTS = ["pass", "fail", "error", "rejected"] as const
export const verdictSchema = z.enum(VERDICTS)
export type Verdict = z.infer<typeof verdictSchema>

export const SUBMISSION_STATUSES = ["pending", "graded"] as const
export const submissionStatusSchema = z.enum(SUBMISSION_STATUSES)
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>

export const FEEDBACK_STATUSES = ["none", "queued", "ready", "failed"] as const
export const feedbackStatusSchema = z.enum(FEEDBACK_STATUSES)
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>

export const COLUMN_TYPE_HINTS = [
  "text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "timestamp",
  "json",
] as const
export const columnTypeHintSchema = z.enum(COLUMN_TYPE_HINTS)
export type ColumnTypeHint = z.infer<typeof columnTypeHintSchema>

export const JOB_KINDS = [
  "task_generate",
  "task_grade",
  "submission_feedback",
  "scheduled_query",
  "quality_check",
  "catalog_refresh",
  "scratch_sweep",
] as const
export const jobKindSchema = z.enum(JOB_KINDS)
export type JobKind = z.infer<typeof jobKindSchema>

export const JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const
export const jobStatusSchema = z.enum(JOB_STATUSES)
export type JobStatus = z.infer<typeof jobStatusSchema>
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ["succeeded", "failed"]

export const WIDGET_KINDS = ["kpi", "line", "bar", "area", "table"] as const
export const widgetKindSchema = z.enum(WIDGET_KINDS)
export type WidgetKind = z.infer<typeof widgetKindSchema>

export const VALUE_FORMATS = ["number", "currency", "percent", "text"] as const
export const valueFormatSchema = z.enum(VALUE_FORMATS)
export type ValueFormat = z.infer<typeof valueFormatSchema>

export const QUALITY_CHECK_KINDS = [
  "not_null",
  "unique",
  "row_count_between",
  "freshness",
  "accepted_values",
  "custom_sql",
] as const
export const qualityCheckKindSchema = z.enum(QUALITY_CHECK_KINDS)
export type QualityCheckKind = z.infer<typeof qualityCheckKindSchema>

export const QUALITY_RUN_STATUSES = ["pass", "fail", "error"] as const
export const qualityRunStatusSchema = z.enum(QUALITY_RUN_STATUSES)
export type QualityRunStatus = z.infer<typeof qualityRunStatusSchema>

export const SEVERITIES = ["low", "medium", "high", "critical"] as const
export const severitySchema = z.enum(SEVERITIES)
export type Severity = z.infer<typeof severitySchema>

export const RUN_STATUSES = ["running", "succeeded", "failed"] as const
export const runStatusSchema = z.enum(RUN_STATUSES)
export type RunStatus = z.infer<typeof runStatusSchema>

export const SERVICE_NAMES = ["app_database", "sandbox_database", "redis", "worker", "llm"] as const
export const serviceNameSchema = z.enum(SERVICE_NAMES)
export type ServiceName = z.infer<typeof serviceNameSchema>

export const SERVICE_STATES = ["operational", "degraded", "down", "not_configured"] as const
export const serviceStateSchema = z.enum(SERVICE_STATES)
export type ServiceState = z.infer<typeof serviceStateSchema>

export const SANDBOX_SESSION_STATUSES = ["active", "expired", "dropped"] as const
export const sandboxSessionStatusSchema = z.enum(SANDBOX_SESSION_STATUSES)
export type SandboxSessionStatus = z.infer<typeof sandboxSessionStatusSchema>

export const SCHEMA_KINDS = ["dataset", "scratch", "system"] as const
export const schemaKindSchema = z.enum(SCHEMA_KINDS)
export type SchemaKind = z.infer<typeof schemaKindSchema>

export const RELATION_KINDS = ["table", "view", "materialized_view", "foreign_table"] as const
export const relationKindSchema = z.enum(RELATION_KINDS)
export type RelationKind = z.infer<typeof relationKindSchema>

export const LINK_KINDS = ["foreign_key", "logical"] as const
export const linkKindSchema = z.enum(LINK_KINDS)
export type LinkKind = z.infer<typeof linkKindSchema>

export const LLM_PROVIDER_NAMES = ["anthropic", "mock"] as const
export const llmProviderNameSchema = z.enum(LLM_PROVIDER_NAMES)
export type LlmProviderName = z.infer<typeof llmProviderNameSchema>

export const API_ERROR_CODES = [
  "validation_failed",
  "not_found",
  "conflict",
  "sql_rejected",
  "sql_timeout",
  "sql_error",
  "sql_cancelled",
  "llm_not_configured",
  "llm_failed",
  "sandbox_session_required",
  "service_unavailable",
  "internal_error",
] as const
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES)
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const COMPARISON_NOTES = [
  "column_count_mismatch",
  "column_names_differ",
  "columns_matched_by_name",
  "row_order_differs",
  "row_count_mismatch",
  "result_truncated",
] as const
export const comparisonNoteSchema = z.enum(COMPARISON_NOTES)
export type ComparisonNote = z.infer<typeof comparisonNoteSchema>
