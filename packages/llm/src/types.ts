import type { LlmProviderName } from "@sequel/contracts"
import type { z } from "zod"

export const LLM_PURPOSES = ["task_generation", "submission_review"] as const
export type LlmPurpose = (typeof LLM_PURPOSES)[number]

export type LlmEffortLevel = "low" | "medium" | "high" | "xhigh" | "max"

export type StructuredRequest<TSchema extends z.ZodType> = {
  purpose: LlmPurpose
  system: string
  user: string
  schema: TSchema
  effort?: LlmEffortLevel
  maxOutputTokens?: number
  metadata?: Record<string, unknown>
}

export type LlmUsageReport = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

export type StructuredResult<T> = {
  data: T
  model: string
  usage: LlmUsageReport
  latencyMs: number
}

export interface LlmProvider {
  readonly name: LlmProviderName
  readonly model: string
  isConfigured(): boolean
  generateStructured<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<StructuredResult<z.infer<TSchema>>>
}

export type LlmSettings = {
  provider: LlmProviderName
  apiKey: string
  model: string
  maxOutputTokens: number
  effort: LlmEffortLevel
  timeoutMs: number
  maxRetries: number
}
