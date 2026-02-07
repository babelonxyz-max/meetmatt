// Lorely Swarm Coordination Engine
// Distributed coordination for multi-bot group chats

import {
  SwarmBot,
  MessageClaim,
  CoordinationConfig,
  DEFAULT_COORDINATION_CONFIG,
  MessagePriority,
  QueuedMessage,
  SwarmStats,
} from "./types";

/**
 * In-memory coordination store (can be replaced with Redis for production)
 */
class CoordinationStore {
  private claims: Map<string, MessageClaim> = new Map();
  private botStates: Map<string, SwarmBot> = new Map();
  private stats: SwarmStats = {
    totalMessages: 0,
    totalResponses: 0,
    avgResponseTimeMs: 0,
    botResponseCounts: new Map(),
    failedClaims: 0,
    lastUpdated: new Date(),
  };

  // Generate claim key
  private claimKey(chatId: string, messageId: string): string {
    return `claim:${chatId}:${messageId}`;
  }

  // Try to claim a message (atomic operation)
  async tryClaim(
    chatId: string,
    messageId: string,
    botId: string,
    priority: MessagePriority,
    ttlMs: number
  ): Promise<boolean> {
    const key = this.claimKey(chatId, messageId);
    
    // Check if already claimed
    const existing = this.claims.get(key);
    if (existing && existing.expiresAt > new Date()) {
      return false; // Already claimed by another bot
    }

    // Create claim
    const claim: MessageClaim = {
      messageId,
      chatId,
      claimedBy: botId,
      claimedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
      priority,
      status: "claimed",
    };

    this.claims.set(key, claim);
    return true;
  }

  // Update claim status
  async updateClaimStatus(
    chatId: string,
    messageId: string,
    status: MessageClaim["status"]
  ): Promise<void> {
    const key = this.claimKey(chatId, messageId);
    const claim = this.claims.get(key);
    if (claim) {
      claim.status = status;
      this.claims.set(key, claim);
    }
  }

  // Get bot state
  async getBotState(botId: string): Promise<SwarmBot | undefined> {
    return this.botStates.get(botId);
  }

  // Update bot state
  async updateBotState(bot: SwarmBot): Promise<void> {
    this.botStates.set(bot.id, bot);
  }

  // Record response
  async recordResponse(botId: string, responseTimeMs: number): Promise<void> {
    this.stats.totalResponses++;
    
    // Update average response time
    const prevTotal = this.stats.avgResponseTimeMs * (this.stats.totalResponses - 1);
    this.stats.avgResponseTimeMs = (prevTotal + responseTimeMs) / this.stats.totalResponses;
    
    // Update bot response count
    const count = this.stats.botResponseCounts.get(botId) || 0;
    this.stats.botResponseCounts.set(botId, count + 1);
    
    this.stats.lastUpdated = new Date();
  }

  // Get stats
  async getStats(): Promise<SwarmStats> {
    return this.stats;
  }

  // Clean expired claims
  async cleanExpiredClaims(): Promise<number> {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, claim] of this.claims.entries()) {
      if (claim.expiresAt < now) {
        this.claims.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

/**
 * Swarm Coordinator - manages multi-bot coordination
 */
export class SwarmCoordinator {
  private config: CoordinationConfig;
  private store: CoordinationStore;
  private bots: Map<string, SwarmBot> = new Map();

  constructor(config: Partial<CoordinationConfig> = {}) {
    this.config = { ...DEFAULT_COORDINATION_CONFIG, ...config };
    this.store = new CoordinationStore();
    
    // Start cleanup interval
    setInterval(() => this.store.cleanExpiredClaims(), 10000);
  }

  /**
   * Register a bot with the swarm
   */
  registerBot(bot: SwarmBot): void {
    this.bots.set(bot.id, bot);
    this.store.updateBotState(bot);
    console.log(`[Swarm] Registered bot: ${bot.name} (${bot.id})`);
  }

  /**
   * Unregister a bot from the swarm
   */
  unregisterBot(botId: string): void {
    this.bots.delete(botId);
    console.log(`[Swarm] Unregistered bot: ${botId}`);
  }

  /**
   * Determine message priority based on content
   */
  determinePriority(text: string, isMention: boolean): MessagePriority {
    const lowerText = text.toLowerCase();
    
    // Direct mention is always urgent
    if (isMention) {
      return "urgent";
    }
    
    // Check for urgent keywords
    for (const keyword of this.config.urgentKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return "urgent";
      }
    }
    
    // Check for high priority keywords
    for (const keyword of this.config.highPriorityKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return "high";
      }
    }
    
    // Default priority
    return "normal";
  }

  /**
   * Select which bot should respond based on weighted random selection
   */
  selectBot(excludeBotIds: string[] = []): SwarmBot | null {
    const availableBots = Array.from(this.bots.values()).filter(
      (bot) => 
        bot.status === "online" && 
        !excludeBotIds.includes(bot.id)
    );

    if (availableBots.length === 0) {
      return null;
    }

    // Weighted random selection
    const totalWeight = availableBots.reduce((sum, bot) => sum + bot.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const bot of availableBots) {
      random -= bot.weight;
      if (random <= 0) {
        return bot;
      }
    }
    
    // Fallback to first available
    return availableBots[0];
  }

  /**
   * Try to claim a message for a specific bot
   * Returns true if the bot should respond
   */
  async shouldRespond(
    botId: string,
    chatId: string,
    messageId: string,
    text: string,
    isMention: boolean
  ): Promise<{ respond: boolean; reason: string }> {
    const bot = this.bots.get(botId);
    
    if (!bot) {
      return { respond: false, reason: "bot-not-registered" };
    }
    
    if (bot.status !== "online") {
      return { respond: false, reason: `bot-status-${bot.status}` };
    }

    // Check cooldown
    if (bot.lastResponseAt) {
      const timeSinceLastResponse = Date.now() - bot.lastResponseAt.getTime();
      if (timeSinceLastResponse < this.config.cooldownMs) {
        return { respond: false, reason: "cooldown" };
      }
    }

    // Determine priority
    const priority = this.determinePriority(text, isMention);
    
    // Try to claim the message
    const claimed = await this.store.tryClaim(
      chatId,
      messageId,
      botId,
      priority,
      this.config.claimTtlMs
    );

    if (!claimed) {
      return { respond: false, reason: "already-claimed" };
    }

    // Update bot state
    bot.status = "busy";
    await this.store.updateBotState(bot);

    return { respond: true, reason: "claimed" };
  }

  /**
   * Mark response as complete
   */
  async completeResponse(
    botId: string,
    chatId: string,
    messageId: string,
    responseTimeMs: number
  ): Promise<void> {
    const bot = this.bots.get(botId);
    
    if (bot) {
      bot.status = "online";
      bot.lastResponseAt = new Date();
      bot.responseCount++;
      await this.store.updateBotState(bot);
    }

    await this.store.updateClaimStatus(chatId, messageId, "completed");
    await this.store.recordResponse(botId, responseTimeMs);
  }

  /**
   * Mark response as failed
   */
  async failResponse(
    botId: string,
    chatId: string,
    messageId: string,
    error: string
  ): Promise<void> {
    const bot = this.bots.get(botId);
    
    if (bot) {
      bot.status = "online"; // Reset to online so it can try again
      await this.store.updateBotState(bot);
    }

    await this.store.updateClaimStatus(chatId, messageId, "failed");
    console.error(`[Swarm] Bot ${botId} failed to respond: ${error}`);
  }

  /**
   * Get swarm statistics
   */
  async getStats(): Promise<SwarmStats> {
    return this.store.getStats();
  }

  /**
   * Get all registered bots
   */
  getBots(): SwarmBot[] {
    return Array.from(this.bots.values());
  }
}

// Singleton instance for shared coordination
let coordinatorInstance: SwarmCoordinator | null = null;

export function getCoordinator(config?: Partial<CoordinationConfig>): SwarmCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new SwarmCoordinator(config);
  }
  return coordinatorInstance;
}

export function resetCoordinator(): void {
  coordinatorInstance = null;
}
