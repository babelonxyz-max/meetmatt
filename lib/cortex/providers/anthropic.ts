import type {
  ProviderName,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  ProviderResult,
  ProviderModel,
} from "../types";
import type { ProviderAdapter } from "./base";
import { calculateCost } from "./base";

const BASE_URL = "https://api.anthropic.com/v1/messages";

const MODELS: Record<string, ProviderModel> = {
  "claude-sonnet-4-6-20250514": {
    provider: "anthropic",
    model: "claude-sonnet-4-6-20250514",
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    maxOutputTokens: 16384,
    latencyClass: "medium",
  },
};

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

function convertToAnthropicMessages(
  messages: ChatMessage[]
): { system: string | undefined; messages: AnthropicMessage[] } {
  let system: string | undefined;
  const converted: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Extract system message(s) — concatenate if multiple
      system = system
        ? `${system}\n\n${msg.content ?? ""}`
        : (msg.content ?? "");
      continue;
    }

    if (msg.role === "tool") {
      // Tool results become user messages with tool_result content blocks
      converted.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.tool_call_id ?? "",
            content: msg.content ?? "",
          },
        ],
      });
      continue;
    }

    if (msg.role === "assistant" && msg.tool_calls && Array.isArray(msg.tool_calls)) {
      // Assistant messages with tool_calls become content blocks
      const blocks: AnthropicContentBlock[] = [];
      if (msg.content) {
        blocks.push({ type: "text", text: msg.content });
      }
      for (const tc of msg.tool_calls as Array<{
        id: string;
        function: { name: string; arguments: string };
      }>) {
        blocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments),
        });
      }
      converted.push({ role: "assistant", content: blocks });
      continue;
    }

    // Standard user or assistant message
    converted.push({
      role: msg.role as "user" | "assistant",
      content: msg.content ?? "",
    });
  }

  return { system, messages: converted };
}

function convertToCompletionResponse(
  data: AnthropicResponse
): ChatCompletionResponse {
  // Extract text content from Anthropic content blocks
  const textContent = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  // Build the message with potential tool_calls
  const message: ChatMessage = {
    role: "assistant",
    content: textContent || null,
  };

  const toolUseBlocks = data.content.filter(
    (block) => block.type === "tool_use"
  );
  if (toolUseBlocks.length > 0) {
    message.tool_calls = toolUseBlocks.map((block) => ({
      id: block.id,
      type: "function",
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input),
      },
    }));
  }

  // Map stop_reason to OpenAI finish_reason
  let finishReason: string = "stop";
  if (data.stop_reason === "tool_use") {
    finishReason = "tool_calls";
  } else if (data.stop_reason === "max_tokens") {
    finishReason = "length";
  }

  return {
    id: data.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      prompt_tokens_details: data.usage.cache_read_input_tokens
        ? { cached_tokens: data.usage.cache_read_input_tokens }
        : undefined,
    },
  };
}

export class AnthropicAdapter implements ProviderAdapter {
  readonly name: ProviderName = "anthropic";

  async complete(
    request: ChatCompletionRequest,
    model: string
  ): Promise<ProviderResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    const modelConfig = MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported Anthropic model: ${model}`);
    }

    const { system, messages } = convertToAnthropicMessages(
      request.messages
    );

    const body: AnthropicRequest = {
      model,
      max_tokens: request.max_tokens ?? modelConfig.maxOutputTokens,
      messages,
    };

    if (system) {
      body.system = system;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.tools) {
      body.tools = request.tools;
    }
    if (request.tool_choice !== undefined) {
      body.tool_choice = request.tool_choice;
    }

    const start = Date.now();

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `Anthropic API error ${res.status}: ${errorBody}`
      );
    }

    const data = (await res.json()) as AnthropicResponse;
    const response = convertToCompletionResponse(data);

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cachedInputTokens = data.usage.cache_read_input_tokens ?? 0;

    return {
      response,
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
