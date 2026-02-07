// Swarm Coordinator Client
// Use this in OpenClaw bots to coordinate responses

import http from "http";

export interface CoordinatorConfig {
  url: string;
  botId: string;
  botName: string;
  weight?: number;
}

export interface CheckResult {
  should_respond: boolean;
  reason: string;
  priority: "urgent" | "high" | "normal" | "low";
}

export interface SwarmStatus {
  stats: {
    totalMessages: number;
    totalResponses: number;
    claimsGranted: number;
    claimsDenied: number;
  };
  bots: Array<{
    id: string;
    name: string;
    status: string;
    responseCount: number;
  }>;
  activeClaims: number;
}

export class SwarmClient {
  private config: CoordinatorConfig;
  private registered: boolean = false;

  constructor(config: CoordinatorConfig) {
    this.config = {
      weight: 5,
      ...config,
    };
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.url);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on("error", reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Register this bot with the coordinator
   */
  async register(): Promise<void> {
    if (this.registered) return;

    await this.request("/register", "POST", {
      bot_id: this.config.botId,
      bot_name: this.config.botName,
      weight: this.config.weight,
    });

    this.registered = true;
    console.log(`[SwarmClient] Registered with coordinator: ${this.config.botName}`);
  }

  /**
   * Check if this bot should respond to a message
   */
  async shouldRespond(
    chatId: string,
    messageId: string,
    messageText?: string,
    isMention?: boolean
  ): Promise<CheckResult> {
    // Auto-register on first check
    if (!this.registered) {
      try {
        await this.register();
      } catch (err) {
        console.warn("[SwarmClient] Failed to register, proceeding anyway:", err);
      }
    }

    try {
      return await this.request<CheckResult>("/check", "POST", {
        chat_id: chatId,
        message_id: messageId,
        bot_id: this.config.botId,
        message_text: messageText,
        is_mention: isMention,
      });
    } catch (err) {
      // If coordinator is down, allow response (fail-open)
      console.warn("[SwarmClient] Coordinator unavailable, allowing response:", err);
      return {
        should_respond: true,
        reason: "coordinator-unavailable",
        priority: "normal",
      };
    }
  }

  /**
   * Mark a response as complete
   */
  async completeResponse(chatId: string, messageId: string): Promise<void> {
    try {
      await this.request("/complete", "POST", {
        chat_id: chatId,
        message_id: messageId,
        bot_id: this.config.botId,
      });
    } catch (err) {
      console.warn("[SwarmClient] Failed to mark complete:", err);
    }
  }

  /**
   * Get swarm status
   */
  async getStatus(): Promise<SwarmStatus> {
    return this.request<SwarmStatus>("/status", "GET");
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string }>("/health", "GET");
      return result.status === "ok";
    } catch {
      return false;
    }
  }
}

// Helper function to create a client from environment variables
export function createSwarmClient(): SwarmClient | null {
  const url = process.env.SWARM_COORDINATOR_URL;
  const botId = process.env.BOT_ID || process.env.TELEGRAM_BOT_TOKEN?.split(":")[0];
  const botName = process.env.BOT_NAME || "Unknown Bot";

  if (!url || !botId) {
    console.warn("[SwarmClient] Missing SWARM_COORDINATOR_URL or BOT_ID");
    return null;
  }

  return new SwarmClient({
    url,
    botId,
    botName,
    weight: parseInt(process.env.BOT_WEIGHT || "5"),
  });
}
