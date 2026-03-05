// Cortex: Context Manager — conversation size control
// Phase 1: heuristic compression (no LLM calls)

import type { ChatMessage, ContextConfig } from "./types";

/**
 * Rough token estimate for a messages array.
 * Uses chars/4 approximation + ~4 tokens overhead per message for role/name.
 */
export function estimateMessageTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    // ~4 tokens overhead per message (role, delimiters, name if present)
    total += 4;
    if (msg.content) {
      total += Math.ceil(msg.content.length / 4);
    }
    if (msg.name) {
      total += Math.ceil(msg.name.length / 4);
    }
  }
  return total;
}

/**
 * Compress conversation context when it exceeds the compression trigger.
 * Strategy is determined by the ContextConfig.
 */
export function compressContext(
  messages: ChatMessage[],
  contextConfig: ContextConfig,
): { messages: ChatMessage[]; compressed: boolean } {
  const totalTokens = estimateMessageTokens(messages);

  if (totalTokens <= contextConfig.compressionTrigger) {
    return { messages, compressed: false };
  }

  switch (contextConfig.strategy) {
    case "sliding-window":
      return applySlidingWindow(messages);
    case "summarize":
      return applySummarize(messages, 8, 100);
    case "hierarchical":
      return applySummarize(messages, 16, 200);
  }
}

/**
 * Sliding-window: keep system message + last 5 user/assistant turn pairs.
 */
function applySlidingWindow(
  messages: ChatMessage[],
): { messages: ChatMessage[]; compressed: boolean } {
  const result: ChatMessage[] = [];

  // Preserve system message if it's first
  const hasSystem = messages.length > 0 && messages[0].role === "system";
  if (hasSystem) {
    result.push(messages[0]);
  }

  // Collect user/assistant pairs from the end
  const tail = hasSystem ? messages.slice(1) : messages;
  const pairs: ChatMessage[] = [];
  let pairCount = 0;

  for (let i = tail.length - 1; i >= 0 && pairCount < 5; i--) {
    const msg = tail[i];
    if (msg.role === "assistant") {
      // Look for the preceding user message
      if (i > 0 && tail[i - 1].role === "user") {
        pairs.unshift(tail[i - 1], msg);
        pairCount++;
        i--; // skip the user message we just added
      } else {
        pairs.unshift(msg);
      }
    } else if (msg.role === "user" && pairCount < 5) {
      // Standalone user message at the very end (no assistant reply yet)
      pairs.unshift(msg);
    }
  }

  result.push(...pairs);
  return { messages: result, compressed: true };
}

/**
 * Summarize / Hierarchical: keep system message, summarize middle, keep tail verbatim.
 * @param keepLast  Number of recent messages to keep verbatim (8 for summarize, 16 for hierarchical)
 * @param charLimit Characters to extract from each dropped user message for the summary
 */
function applySummarize(
  messages: ChatMessage[],
  keepLast: number,
  charLimit: number,
): { messages: ChatMessage[]; compressed: boolean } {
  const result: ChatMessage[] = [];

  // Preserve system message if it's first
  const hasSystem = messages.length > 0 && messages[0].role === "system";
  if (hasSystem) {
    result.push(messages[0]);
  }

  const bodyStart = hasSystem ? 1 : 0;
  const totalBody = messages.length - bodyStart;

  // If there aren't enough messages to compress, return as-is
  if (totalBody <= keepLast) {
    return { messages, compressed: false };
  }

  const cutoff = messages.length - keepLast;
  const droppedMessages = messages.slice(bodyStart, cutoff);
  const keptMessages = messages.slice(cutoff);

  // Build summary from dropped user messages
  const snippets: string[] = [];
  for (const msg of droppedMessages) {
    if (msg.role === "user" && msg.content) {
      snippets.push(msg.content.slice(0, charLimit));
    }
  }

  if (snippets.length > 0) {
    const summaryContent = `[Previous conversation summary: ${snippets.join("; ")}]`;
    result.push({ role: "system", content: summaryContent });
  }

  result.push(...keptMessages);
  return { messages: result, compressed: true };
}

/**
 * Hard limit enforcement. Trims oldest non-system messages until under maxInputTokens.
 * Always preserves: system message + last 3 user/assistant pairs (6 messages).
 */
export function enforceInputLimit(
  messages: ChatMessage[],
  maxInputTokens: number,
): ChatMessage[] {
  if (estimateMessageTokens(messages) <= maxInputTokens) {
    return messages;
  }

  // Identify protected indices
  const protected_ = new Set<number>();

  // Protect system message(s)
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "system") {
      protected_.add(i);
    }
  }

  // Protect last 3 user/assistant pairs (walk backwards)
  let pairsFound = 0;
  for (let i = messages.length - 1; i >= 0 && pairsFound < 3; i--) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      protected_.add(i);
      if (i > 0 && messages[i - 1].role === "user") {
        protected_.add(i - 1);
        pairsFound++;
        i--; // skip the user message
      }
    } else if (msg.role === "user" && pairsFound < 3) {
      // Standalone user at the tail (no assistant reply yet)
      protected_.add(i);
    }
  }

  // Build removable indices (oldest first)
  const removable: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (!protected_.has(i)) {
      removable.push(i);
    }
  }

  // Remove from oldest until under limit
  const removed = new Set<number>();
  let current = [...messages];

  for (const idx of removable) {
    removed.add(idx);
    current = messages.filter((_, i) => !removed.has(i));
    if (estimateMessageTokens(current) <= maxInputTokens) {
      break;
    }
  }

  return current;
}
