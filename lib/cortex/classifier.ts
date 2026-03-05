import type {
  ChatCompletionRequest,
  ChatMessage,
  ClassificationResult,
  ClassifierConfig,
  Tier,
} from "./types";

/**
 * Rough token estimator: ~4 characters per token.
 */
export function estimateTokenCount(messages: ChatMessage[]): number {
  let totalChars = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      totalChars += msg.content.length;
    }
  }
  return Math.ceil(totalChars / 4);
}

/**
 * Heuristic request classifier.
 * Scores a request across 4 dimensions (0-2 each) and maps the sum to a tier.
 */
export function classifyRequest(
  request: ChatCompletionRequest,
  classifierConfig: ClassifierConfig
): ClassificationResult {
  const estimatedTokens = estimateTokenCount(request.messages);
  const tokenScore = estimatedTokens < 200 ? 0 : estimatedTokens <= 2000 ? 1 : 2;

  // Keyword scan: check last user message against hardKeywords
  const lastUserMessage = findLastUserMessage(request.messages);
  const keywordScore = scoreKeywords(lastUserMessage, classifierConfig.hardKeywords);

  // Tool count: tool_calls in messages + tools array on the request
  const toolCount = countTools(request);
  const toolScore = toolCount <= 1 ? 0 : toolCount <= 3 ? 1 : 2;

  // Depth: count messages with role "user"
  const turnCount = request.messages.filter((m) => m.role === "user").length;
  const depthScore = turnCount < 5 ? 0 : turnCount <= 15 ? 1 : 2;

  const score = tokenScore + keywordScore + toolScore + depthScore;

  let tier: Tier;
  if (score <= 1) {
    tier = "easy";
  } else if (score <= 4) {
    tier = "medium";
  } else {
    tier = "hard";
  }

  return {
    tier,
    score,
    signals: {
      tokenScore,
      keywordScore,
      toolScore,
      depthScore,
    },
  };
}

function findLastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && typeof messages[i].content === "string") {
      return messages[i].content as string;
    }
  }
  return "";
}

function scoreKeywords(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      return 2;
    }
  }
  return 0;
}

function countTools(request: ChatCompletionRequest): number {
  let count = 0;

  // Count tools defined on the request
  if (Array.isArray(request.tools)) {
    count += request.tools.length;
  }

  // Count tool_calls across all messages
  for (const msg of request.messages) {
    if (Array.isArray(msg.tool_calls)) {
      count += msg.tool_calls.length;
    }
  }

  return count;
}
