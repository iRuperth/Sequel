import type {
  Difficulty,
  ExecutionStatus,
  FeedbackStatus,
  JobStatus,
  QualityRunStatus,
  RunStatus,
  ServiceState,
  Severity,
  TaskStatus,
  Verdict,
} from "@sequel/contracts"

export type Tone = "neutral" | "accent" | "info" | "success" | "warning" | "danger"

export const executionStatusTone: Record<ExecutionStatus, Tone> = {
  succeeded: "success",
  failed: "danger",
  cancelled: "neutral",
  timed_out: "warning",
  rejected: "warning",
}

export const taskStatusTone: Record<TaskStatus, Tone> = {
  generating: "info",
  open: "accent",
  in_progress: "warning",
  solved: "success",
  abandoned: "neutral",
  failed_generation: "danger",
}

export const verdictTone: Record<Verdict, Tone> = {
  pass: "success",
  fail: "warning",
  error: "danger",
  rejected: "danger",
}

export const jobStatusTone: Record<JobStatus, Tone> = {
  queued: "neutral",
  running: "info",
  succeeded: "success",
  failed: "danger",
}

export const runStatusTone: Record<RunStatus, Tone> = {
  running: "info",
  succeeded: "success",
  failed: "danger",
}

export const qualityRunStatusTone: Record<QualityRunStatus, Tone> = {
  pass: "success",
  fail: "danger",
  error: "warning",
}

export const severityTone: Record<Severity, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
}

export const serviceStateTone: Record<ServiceState, Tone> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
  not_configured: "neutral",
}

export const feedbackStatusTone: Record<FeedbackStatus, Tone> = {
  none: "neutral",
  queued: "info",
  ready: "success",
  failed: "danger",
}

export const difficultyTone: Record<Difficulty, Tone> = {
  beginner: "success",
  intermediate: "info",
  advanced: "warning",
  expert: "danger",
}

export const toneTextClass: Record<Tone, string> = {
  neutral: "text-fg-muted",
  accent: "text-accent-2",
  info: "text-accent-2",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

export const toneDotClass: Record<Tone, string> = {
  neutral: "bg-fg-subtle",
  accent: "bg-accent",
  info: "bg-accent-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

export const toneSoftClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  accent: "bg-accent/15 text-accent-2",
  info: "bg-accent-2/12 text-accent-2",
  success: "bg-success/14 text-success",
  warning: "bg-warning/14 text-warning",
  danger: "bg-danger/14 text-danger",
}

export const toneBarClass: Record<Tone, string> = {
  neutral: "bg-fg-subtle",
  accent: "bg-accent",
  info: "bg-accent-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}
