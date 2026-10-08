import { AnthropicProvider } from "./anthropic"
import { MockProvider, type MockResponder } from "./mock"
import type { LlmProvider, LlmSettings } from "./types"

export function createLlmProvider(
  settings: LlmSettings,
  mockResponder: MockResponder,
): LlmProvider {
  switch (settings.provider) {
    case "anthropic":
      return new AnthropicProvider(settings)
    case "mock":
      return new MockProvider(mockResponder)
  }
}
