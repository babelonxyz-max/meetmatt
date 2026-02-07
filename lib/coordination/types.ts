// Types for Lorely Swarm Coordination Engine
// Handles multi-bot coordination for group chats

export interface SwarmBot {
  id: string;
  name: string;
  username: string;
  token: string;
  weight: number;  // Higher weight = more likely to respond (1-10)
  personality?: string;
  skills: string[];
  status: BotStatus;
  lastResponseAt?: Date;
  responseCount: number;
}

export type BotStatus = 
  | "online"      // Bot is active and can respond
  | "busy"        // Bot is currently processing
  | "cooldown"    // Bot recently responded, in cooldown
  | "offline"     // Bot is not running
  | "error";      // Bot has an error

export interface MessageClaim {
  messageId: string;
  chatId: string;
  claimedBy: string;  // Bot ID
  claimedAt: Date;
  expiresAt: Date;
  priority: MessagePriority;
  status: ClaimStatus;
}

export type ClaimStatus = 
  | "claimed"     // Bot has claimed the message
  | "processing"  // Bot is generating response
  | "completed"   // Response sent
  | "failed"      // Bot failed to respond
  | "expired";    // Claim expired

export type MessagePriority = 
  | "urgent"      // Immediate response needed (direct question, @mention)
  | "high"        // Important message (keywords, context)
  | "normal"      // Regular message
  | "low";        // Background/noise

export interface CoordinationConfig {
  // Redis connection
  redisUrl?: string;
  
  // Timing
  claimTtlMs: number;        // How long a claim lasts (default: 30s)
  cooldownMs: number;        // Cooldown between responses (default: 5s)
  processingTimeoutMs: number; // Max time to process (default: 60s)
  
  // Behavior
  requireMention: boolean;   // Require @mention in groups
  allowMultipleResponses: boolean; // Allow multiple bots to respond
  maxBotsPerMessage: number; // Max bots that can respond to one message
  
  // Priority keywords
  urgentKeywords: string[];
  highPriorityKeywords: string[];
}

export const DEFAULT_COORDINATION_CONFIG: CoordinationConfig = {
  claimTtlMs: 30000,
  cooldownMs: 5000,
  processingTimeoutMs: 60000,
  requireMention: false,
  allowMultipleResponses: false,
  maxBotsPerMessage: 1,
  urgentKeywords: ["urgent", "help", "emergency", "asap", "now"],
  highPriorityKeywords: ["please", "question", "?", "how", "what", "why"],
};

export interface SwarmState {
  bots: Map<string, SwarmBot>;
  activeClaims: Map<string, MessageClaim>;
  messageQueue: QueuedMessage[];
  stats: SwarmStats;
}

export interface QueuedMessage {
  id: string;
  chatId: string;
  text: string;
  fromUserId: number;
  fromUsername?: string;
  priority: MessagePriority;
  receivedAt: Date;
  attempts: number;
}

export interface SwarmStats {
  totalMessages: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  botResponseCounts: Map<string, number>;
  failedClaims: number;
  lastUpdated: Date;
}

// Rate limiting for API providers
export interface ProviderRateLimit {
  provider: string;
  requestsPerMinute: number;
  tokensPerMinute: number;
  currentRequests: number;
  currentTokens: number;
  resetAt: Date;
}

export interface APIProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  priority: number;  // Lower = preferred
  rateLimit: ProviderRateLimit;
  status: "available" | "rate_limited" | "error" | "disabled";
}

export const DEFAULT_PROVIDERS: Partial<APIProvider>[] = [
  {
    name: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k2-0711-preview",
    priority: 1,
  },
  {
    name: "nvidia",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek/deepseek-r1",
    priority: 2,
  },
  {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-r1",
    priority: 3,
  },
];
