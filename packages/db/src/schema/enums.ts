import {
  COLUMN_TYPE_HINTS,
  DIFFICULTIES,
  EXECUTION_MODES,
  EXECUTION_SOURCES,
  EXECUTION_STATUSES,
  FEEDBACK_STATUSES,
  JOB_KINDS,
  JOB_STATUSES,
  LINK_KINDS,
  QUALITY_CHECK_KINDS,
  QUALITY_RUN_STATUSES,
  REJECTION_REASONS,
  RELATION_KINDS,
  RUN_STATUSES,
  SANDBOX_SESSION_STATUSES,
  SEVERITIES,
  SUBMISSION_STATUSES,
  TASK_MODES,
  TASK_SOURCES,
  TASK_STATUSES,
  TOPICS,
  TRACKS,
  VERDICTS,
  WIDGET_KINDS,
} from "@sequel/contracts"
import { pgEnum } from "drizzle-orm/pg-core"

export const executionModeEnum = pgEnum("execution_mode", EXECUTION_MODES)
export const executionStatusEnum = pgEnum("execution_status", EXECUTION_STATUSES)
export const executionSourceEnum = pgEnum("execution_source", EXECUTION_SOURCES)
export const rejectionReasonEnum = pgEnum("rejection_reason", REJECTION_REASONS)
export const trackEnum = pgEnum("track", TRACKS)
export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES)
export const topicEnum = pgEnum("topic", TOPICS)
export const taskModeEnum = pgEnum("task_mode", TASK_MODES)
export const taskStatusEnum = pgEnum("task_status", TASK_STATUSES)
export const taskSourceEnum = pgEnum("task_source", TASK_SOURCES)
export const verdictEnum = pgEnum("verdict", VERDICTS)
export const submissionStatusEnum = pgEnum("submission_status", SUBMISSION_STATUSES)
export const feedbackStatusEnum = pgEnum("feedback_status", FEEDBACK_STATUSES)
export const columnTypeHintEnum = pgEnum("column_type_hint", COLUMN_TYPE_HINTS)
export const jobKindEnum = pgEnum("job_kind", JOB_KINDS)
export const jobStatusEnum = pgEnum("job_status", JOB_STATUSES)
export const widgetKindEnum = pgEnum("widget_kind", WIDGET_KINDS)
export const qualityCheckKindEnum = pgEnum("quality_check_kind", QUALITY_CHECK_KINDS)
export const qualityRunStatusEnum = pgEnum("quality_run_status", QUALITY_RUN_STATUSES)
export const severityEnum = pgEnum("severity", SEVERITIES)
export const runStatusEnum = pgEnum("run_status", RUN_STATUSES)
export const sandboxSessionStatusEnum = pgEnum("sandbox_session_status", SANDBOX_SESSION_STATUSES)
export const relationKindEnum = pgEnum("relation_kind", RELATION_KINDS)
export const linkKindEnum = pgEnum("link_kind", LINK_KINDS)
