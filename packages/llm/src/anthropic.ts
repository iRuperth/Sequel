import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import type { z } from "zod"
import { LlmError } from "./errors"
import type { LlmProvider, LlmSettings, StructuredRequest, StructuredResult } from "./types"

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const
  readonly model: string
  private readonly client: Anthropic | null

  constructor(private readonly settings: LlmSettings) {
    this.model = settings.model
    this.client = settings.apiKey
      ? new Anthropic({
          apiKey: settings.apiKey,
          timeout: settings.timeoutMs,
          maxRetries: settings.maxRetries,
        })
      : null
  }

  isConfigured(): boolean {
    return this.client !== null
  }

  async generateStructured<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<StructuredResult<z.infer<TSchema>>> {
    if (!this.client) {
      throw new LlmError("not_configured", "LLM_API_KEY is not set")
    }
    const started = performance.now()
    try {
      const stream = this.client.messages.stream({
        model: this.settings.model,
        max_tokens: request.maxOutputTokens ?? this.settings.maxOutputTokens,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.user }],
        output_config: {
          effort: request.effort ?? this.settings.effort,
          format: zodOutputFormat(request.schema),
        },
      })
      const message = await stream.finalMessage()
      if (message.stop_reason === "refusal") {
        throw new LlmError("refused", "The model declined the request", {
          category: message.stop_details?.category ?? null,
        })
      }
      if (message.stop_reason === "max_tokens") {
        throw new LlmError("truncated", "The model response hit the output token limit")
      }
      const parsed = message.parsed_output
      if (parsed === null || parsed === undefined) {
        throw new LlmError("invalid_output", "The model response did not match the expected schema")
      }
      return {
        data: parsed as z.infer<TSchema>,
        model: message.model,
        latencyMs: Math.round(performance.now() - started),
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadInputTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheCreationInputTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
      }
    } catch (error) {
      throw translateError(error)
    }
  }
}

function translateError(error: unknown): LlmError {
  if (error instanceof LlmError) {
    return error
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new LlmError("authentication", error.message, { status: error.status })
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new LlmError("rate_limited", error.message, { status: error.status })
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    return new LlmError("bad_request", error.message, { status: error.status })
  }
  if (
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  ) {
    return new LlmError("unavailable", error.message)
  }
  if (error instanceof Anthropic.APIError) {
    return new LlmError("unavailable", error.message, { status: error.status })
  }
  if (error instanceof Anthropic.AnthropicError) {
    return new LlmError("invalid_output", error.message)
  }
  return new LlmError("unavailable", error instanceof Error ? error.message : String(error))
}
