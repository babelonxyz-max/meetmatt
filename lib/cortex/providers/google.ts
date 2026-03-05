import type {
  ProviderName,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderResult,
  ProviderModel,
} from "../types";
import type { ProviderAdapter } from "./base";
import { calculateCost } from "./base";

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const MODELS: Record<string, ProviderModel> = {
  "gemini-2.0-flash": {
    provider: "google",
    model: "gemini-2.0-flash",
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4,
    maxOutputTokens: 8192,
    latencyClass: "fast",
  },
};

export class GoogleAdapter implements ProviderAdapter {
  readonly name: ProviderName = "google";

  async complete(
    request: ChatCompletionRequest,
    model: string
  ): Promise<ProviderResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not set");
    }

    const modelConfig = MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported Google model: ${model}`);
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
        `Google API error ${res.status}: ${errorBody}`
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
