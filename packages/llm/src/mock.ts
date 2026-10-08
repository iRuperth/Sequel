import type { z } from "zod"
import { LlmError } from "./errors"
import type { LlmProvider, StructuredRequest, StructuredResult } from "./types"

export type MockResponder = (request: StructuredRequest<z.ZodType>) => unknown | Promise<unknown>

export const MOCK_MODEL = "mock"

export class MockProvider implements LlmProvider {
  readonly name = "mock" as const
  readonly model = MOCK_MODEL

  constructor(private readonly responder: MockResponder) {}

  isConfigured(): boolean {
    return true
  }

  async generateStructured<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<StructuredResult<z.infer<TSchema>>> {
    const started = performance.now()
    const raw = await this.responder(request as StructuredRequest<z.ZodType>)
    const parsed = request.schema.safeParse(raw)
    if (!parsed.success) {
      throw new LlmError("invalid_output", parsed.error.message)
    }
    return {
      data: parsed.data,
      model: MOCK_MODEL,
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
    }
  }
}
