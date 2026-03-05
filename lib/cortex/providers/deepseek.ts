import type {
  ProviderName,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderResult,
  ProviderModel,
} from "../types";
import type { ProviderAdapter } from "./base";
import { calculateCost } from "./base";

const BASE_URL = "https://api.deepseek.com/v1/chat/completions";

const MODELS: Record<string, ProviderModel> = {
  "deepseek-chat": {
    provider: "deepseek",
    model: "deepseek-chat",
    inputPricePerMillion: 0.27,
    outputPricePerMillion: 1.1,
    maxOutputTokens: 8192,
    latencyClass: "medium",
  },
};

export class DeepSeekAdapter implements ProviderAdapter {
  readonly name: ProviderName = "deepseek";

  async complete(
    request: ChatCompletionRequest,
    model: string
  ): Promise<ProviderResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not set");
    }

    const modelConfig = MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported DeepSeek model: ${model}`);
    }

    const body = {
      ...request,
      model,
      stream: false,
    };

    const start = Date.now();

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `DeepSeek API error ${res.status}: ${errorBody}`
      );
    }

    const data = (await res.json()) as ChatCompletionResponse;

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cachedInputTokens =
      data.usage.prompt_tokens_details?.cached_tokens ?? 0;

    return {
      response: data,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      costUsd: calculateCost(inputTokens, outputTokens, modelConfig),
      latencyMs,
      ttftMs: null,
      provider: this.name,
      model,
    };
  }
}
