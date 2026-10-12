import type {
  ApiErrorCode,
  ColumnTypeHint,
  ComparisonNote,
  Difficulty,
  ExecutionMode,
  ExecutionSource,
  ExecutionStatus,
  FeedbackStatus,
  JobKind,
  JobStatus,
  QualityCheckKind,
  QualityRunStatus,
  RejectionReason,
  RelationKind,
  RunStatus,
  SchemaKind,
  ServiceName,
  ServiceState,
  Severity,
  TaskMode,
  TaskSource,
  TaskStatus,
  Topic,
  Track,
  ValueFormat,
  Verdict,
  WidgetKind,
} from "@sequel/contracts"

export const executionModeLabels: Record<ExecutionMode, string> = {
  read: "Read only",
  scratch: "Scratch workspace",
  explain: "Explain",
  grade: "Grading",
}

export const executionStatusLabels: Record<ExecutionStatus, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  timed_out: "Timed out",
  rejected: "Rejected",
}

export const executionSourceLabels: Record<ExecutionSource, string> = {
  workbench: "Workbench",
  task: "Task",
  scheduled: "Scheduled",
  dashboard: "Dashboard",
  quality: "Data quality",
}

export const rejectionReasonLabels: Record<RejectionReason, string> = {
  empty_query: "The query is empty.",
  syntax_error: "The query could not be parsed.",
  multiple_statements:
    "Read only mode runs one statement at a time. Switch to the scratch workspace to run scripts.",
  too_many_statements: "The script exceeds the maximum number of statements allowed per run.",
  statement_not_allowed: "This statement type is not allowed in the current mode.",
  function_not_allowed: "This query calls a function that is restricted on the shared warehouse.",
  schema_not_allowed: "This query references a schema you do not have access to.",
  data_modifying_cte: "Data modifying CTEs are only allowed in the scratch workspace.",
  scratch_session_required: "Open a scratch workspace before running DDL or DML.",
}

export const trackLabels: Record<Track, string> = {
  data_analyst: "Data Analyst",
  data_engineer: "Data Engineer",
  data_scientist: "Data Scientist",
}

export const trackDescriptions: Record<Track, string> = {
  data_analyst: "Reporting, KPIs and ad hoc analysis for business stakeholders.",
  data_engineer: "Modelling, pipelines, data quality and performance.",
  data_scientist: "Cohorts, experiments, distributions and feature extraction.",
}

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
}

export const difficultySeniority: Record<Difficulty, string> = {
  beginner: "Intern",
  intermediate: "Junior",
  advanced: "Mid level",
  expert: "Senior",
}

export const topicLabels: Record<Topic, string> = {
  select_basics: "SELECT basics",
  filtering: "Filtering",
  sorting_limiting: "Sorting and limiting",
  aggregation: "Aggregation",
  joins: "Joins",
  subqueries: "Subqueries",
  ctes: "Common table expressions",
  window_functions: "Window functions",
  date_time: "Dates and times",
  string_functions: "String functions",
  conditional_logic: "Conditional logic",
  set_operations: "Set operations",
  null_handling: "NULL handling",
  data_modelling_ddl: "Data modelling and DDL",
  dml: "Data manipulation",
  query_optimisation: "Query optimisation",
  data_quality: "Data quality",
  analytics_patterns: "Analytics patterns",
}

export const taskModeLabels: Record<TaskMode, string> = {
  read: "Query",
  scratch: "Build",
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  generating: "Generating",
  open: "Open",
  in_progress: "In progress",
  solved: "Solved",
  abandoned: "Closed",
  failed_generation: "Generation failed",
}

export const taskSourceLabels: Record<TaskSource, string> = {
  starter: "Onboarding",
  generated: "Generated",
}

export const verdictLabels: Record<Verdict, string> = {
  pass: "Accepted",
  fail: "Changes requested",
  error: "Query failed",
  rejected: "Rejected",
}

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  none: "Not requested",
  queued: "Reviewing",
  ready: "Ready",
  failed: "Unavailable",
}

export const columnTypeHintLabels: Record<ColumnTypeHint, string> = {
  text: "text",
  integer: "integer",
  decimal: "decimal",
  boolean: "boolean",
  date: "date",
  timestamp: "timestamp",
  json: "json",
}

export const jobKindLabels: Record<JobKind, string> = {
  task_generate: "Task generation",
  task_grade: "Submission grading",
  submission_feedback: "Code review",
  scheduled_query: "Scheduled query",
  quality_check: "Quality check",
  catalog_refresh: "Catalog refresh",
  scratch_sweep: "Workspace cleanup",
}

export const jobStatusLabels: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
}

export const widgetKindLabels: Record<WidgetKind, string> = {
  kpi: "KPI",
  line: "Line chart",
  bar: "Bar chart",
  area: "Area chart",
  table: "Table",
}

export const valueFormatLabels: Record<ValueFormat, string> = {
  number: "Number",
  currency: "Currency",
  percent: "Percent",
  text: "Text",
}

export const qualityCheckKindLabels: Record<QualityCheckKind, string> = {
  not_null: "Not null",
  unique: "Unique",
  row_count_between: "Row count between",
  freshness: "Freshness",
  accepted_values: "Accepted values",
  custom_sql: "Custom SQL",
}

export const qualityRunStatusLabels: Record<QualityRunStatus, string> = {
  pass: "Passing",
  fail: "Failing",
  error: "Error",
}

export const severityLabels: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
}

export const runStatusLabels: Record<RunStatus, string> = {
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
}

export const serviceNameLabels: Record<ServiceName, string> = {
  app_database: "Metadata store",
  sandbox_database: "Warehouse",
  redis: "Job broker",
  worker: "Worker",
  llm: "Task generator",
}

export const serviceStateLabels: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Unavailable",
  not_configured: "Not configured",
}

export const schemaKindLabels: Record<SchemaKind, string> = {
  dataset: "Dataset",
  scratch: "Scratch",
  system: "System",
}

export const relationKindLabels: Record<RelationKind, string> = {
  table: "Table",
  view: "View",
  materialized_view: "Materialized view",
  foreign_table: "Foreign table",
}

export const apiErrorMessages: Record<ApiErrorCode, string> = {
  validation_failed: "The request is invalid.",
  not_found: "The requested resource does not exist.",
  conflict: "The resource is in a state that does not allow this action.",
  sql_rejected: "The query was rejected by the warehouse policy.",
  sql_timeout: "The query exceeded the statement timeout.",
  sql_error: "The query failed.",
  sql_cancelled: "The query was cancelled.",
  llm_not_configured:
    "Task generation is not configured. Set LLM_API_KEY or use LLM_PROVIDER=mock.",
  llm_failed: "The task generator did not return a usable task.",
  sandbox_session_required: "Open a scratch workspace first.",
  service_unavailable: "A required service is unavailable.",
  internal_error: "Something went wrong on our side.",
}

export const comparisonNoteLabels: Record<ComparisonNote, string> = {
  column_count_mismatch: "The number of output columns differs from the expected output.",
  column_names_differ:
    "Column names differ from the expected output. Values were compared by position.",
  columns_matched_by_name: "Columns were matched by name because they are in a different order.",
  row_order_differs: "The rows are correct but not in the required order.",
  row_count_mismatch: "The number of rows differs from the expected output.",
  result_truncated: "Your result exceeded the row limit and was truncated.",
}

export const taskTexts = {
  generatingTitle: "New ticket in preparation",
  generationFailed:
    "The task generator could not produce a valid ticket. Retry to request a new one.",
  generationNotConfigured:
    "Task generation is not configured. Set LLM_API_KEY or switch LLM_PROVIDER to mock.",
  reviewUnavailable: "The automated review is unavailable right now.",
} as const

export const jobStageLabels = {
  queued: "Queued",
  planning: "Planning the ticket",
  drafting: "Drafting the ticket",
  validating: "Validating the reference solution",
  retrying: "Revising the ticket after validation",
  publishing: "Publishing the ticket",
  gradingSubmission: "Running your query",
  gradingReference: "Running the reference solution",
  comparing: "Comparing results",
  reviewing: "Reviewing your SQL",
  running: "Running",
  refreshingCatalog: "Refreshing catalog",
  done: "Done",
} as const

export const validationProblems = {
  executionFailed: "The reference SQL failed: {message}",
  rejected: "The reference SQL was rejected by the warehouse policy: {message}",
  emptyResult: "The reference SQL returned no rows. The task must produce at least one row.",
  tooManyRows: "The reference SQL returned more than {max} rows. Narrow the output.",
  columnMismatch:
    "The reference SQL returned {actual} columns but expectedColumns lists {expected}.",
  nonDeterministic:
    "The reference SQL returned different results on two runs. Make the ordering and logic deterministic.",
  missingVerification: "Scratch mode tasks need a verificationSql SELECT statement.",
  missingHints: "The ticket must include three progressive hints.",
} as const

export const qualityMessages = {
  passed: "Check passed. Observed value: {value}.",
  failed: "Check failed. Observed value: {value}. {expectation}",
  errored: "Check could not run: {message}",
  missingColumn: "This check type requires a target column.",
  missingSql: "Custom SQL checks require a SELECT statement that returns the violating rows.",
  expectations: {
    not_null: "Expected no NULL values in {column}.",
    unique: "Expected no duplicated values in {column}.",
    row_count_between: "Expected between {min} and {max} rows.",
    freshness: "Expected the latest {column} within {hours} hours of the warehouse snapshot.",
    accepted_values: "Expected only accepted values in {column}.",
    custom_sql: "Expected the query to return no violating rows.",
  },
} as const
