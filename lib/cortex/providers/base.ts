import type {
  ProviderName,
  ProviderModel,
  ChatCompletionRequest,
  ProviderResult,
} from "../types";

export interface ProviderAdapter {
  readonly name: ProviderName;
  complete(
    request: ChatCompletionRequest,
    model: string
  ): Promise<ProviderResult>;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ProviderModel
): number {
  return (
    (inputTokens * model.inputPricePerMillion +
      outputTokens * model.outputPricePerMillion) /
    1_000_000
  );
}

// Lazy-loaded adapter registry to avoid circular imports
const adapters = new Map<ProviderName, ProviderAdapter>();

function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.name, adapter);
}

export function getAdapter(provider: ProviderName): ProviderAdapter {
  // Lazy initialization on first call
  if (adapters.size === 0) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAIAdapter } = require("./openai");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleAdapter } = require("./google");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DeepSeekAdapter } = require("./deepseek");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AnthropicAdapter } = require("./anthropic");

    registerAdapter(new OpenAIAdapter());
    registerAdapter(new GoogleAdapter());
    registerAdapter(new DeepSeekAdapter());
    registerAdapter(new AnthropicAdapter());
  }

  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}
