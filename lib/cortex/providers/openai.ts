import type {
  ProviderName,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderResult,
  ProviderModel,
} from "../types";
import type { ProviderAdapter } from "./base";
import { calculateCost } from "./base";

const BASE_URL = "https://api.openai.com/v1/chat/completions";

const MODELS: Record<string, ProviderModel> = {
  "gpt-4.1-nano": {
    provider: "openai",
    model: "gpt-4.1-nano",
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4,
    maxOutputTokens: 32768,
    latencyClass: "fast",
  },
  "gpt-4.1-mini": {
    provider: "openai",
    model: "gpt-4.1-mini",
    inputPricePerMillion: 0.4,
    outputPricePerMillion: 1.6,
    maxOutputTokens: 32768,
    latencyClass: "fast",
  },
  "gpt-4.1": {
    provider: "openai",
    model: "gpt-4.1",
    inputPricePerMillion: 2.0,
    outputPricePerMillion: 8.0,
    maxOutputTokens: 32768,
    latencyClass: "medium",
  },
};

export class OpenAIAdapter implements ProviderAdapter {
  readonly name: ProviderName = "openai";

  async complete(
    request: ChatCompletionRequest,
    model: string
  ): Promise<ProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const modelConfig = MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported OpenAI model: ${model}`);
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
        `OpenAI API error ${res.status}: ${errorBody}`
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
      ttftMs: null, // non-streaming
      provider: this.name,
      model,
    };
  }
}
