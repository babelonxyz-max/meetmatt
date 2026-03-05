// Cortex: Budget Tracker — Per-agent daily inference spend tracking via Redis (Upstash)

import { Redis } from "@upstash/redis";
import type { BudgetConfig, BudgetConstraint, BudgetState, Tier } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dailyKey(agentId: string, date: string): string {
  return `cortex:budget:${agentId}:${date}`;
}

function hardKey(agentId: string, date: string): string {
  return `cortex:budget:${agentId}:${date}:hard`;
}

const TTL_48H = 172800; // seconds

// ---------------------------------------------------------------------------
// KV abstraction — Redis or in-memory fallback
// ---------------------------------------------------------------------------

interface KV {
  get(key: string): Promise<number>;
  incrByFloat(key: string, delta: number): Promise<void>;
  scan(pattern: string): Promise<string[]>;
}

/** Upstash REST Redis adapter */
function redisKV(url: string): KV {
  const client = new Redis({
    url,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  });

  return {
    async get(key) {
      const val = await client.get<string | number | null>(key);
      return val === null || val === undefined ? 0 : Number(val);
    },
    async incrByFloat(key, delta) {
      await client.incrbyfloat(key, delta);
      // Set TTL only if the key has no expiry yet (ttl returns -1 when no expiry)
      const ttl = await client.ttl(key);
      if (ttl === -1) {
        await client.expire(key, TTL_48H);
      }
    },
    async scan(pattern) {
      const keys: string[] = [];
      let cursor = 0;
      do {
        const [next, batch] = await client.scan(cursor, {
          match: pattern,
          count: 100,
        });
        cursor = Number(next);
        keys.push(...batch);
      } while (cursor !== 0);
      return keys;
    },
  };
}

/** In-memory fallback for local dev / tests */
function memoryKV(): KV {
  const store = new Map<string, number>();
  return {
    async get(key) {
      return store.get(key) ?? 0;
    },
    async incrByFloat(key, delta) {
      store.set(key, (store.get(key) ?? 0) + delta);
    },
    async scan(pattern) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/:/g, "\\:") + "$",
      );
      return Array.from(store.keys()).filter((k) => regex.test(k));
    },
  };
}

// ---------------------------------------------------------------------------
// BudgetTracker
// ---------------------------------------------------------------------------

function deriveConstraint(
  usedPercent: number,
  thresholds: BudgetConfig["thresholds"],
): BudgetConstraint {
  if (usedPercent >= thresholds.failClosed) return "fail_closed";
  if (usedPercent >= thresholds.forceCheap) return "force_cheap";
  if (usedPercent >= thresholds.biasTowardCheap) return "bias_cheap";
  return "none";
}

export class BudgetTracker {
  private kv: KV;

  constructor(kv: KV) {
    this.kv = kv;
  }

  /**
   * Read current budget state for an agent.
   * If Redis is unreachable, returns a fail-safe state that forces cheap routing.
   */
  async getBudgetState(
    agentId: string,
    budget: BudgetConfig,
  ): Promise<BudgetState> {
    const date = todayUTC();

    try {
      const [totalSpend, hardTierSpend] = await Promise.all([
        this.kv.get(dailyKey(agentId, date)),
        this.kv.get(hardKey(agentId, date)),
      ]);

      const usedPercent =
        budget.dailyCap > 0 ? totalSpend / budget.dailyCap : 0;
      const hardCap = budget.dailyCap * budget.hardTierMaxPercent;
      const hardUsedPercent = hardCap > 0 ? hardTierSpend / hardCap : 0;

      const constraint = deriveConstraint(usedPercent, budget.thresholds);

      return {
        agentId,
        date,
        totalSpend,
        hardTierSpend,
        dailyCap: budget.dailyCap,
        usedPercent,
        hardUsedPercent,
        constraint,
      };
    } catch {
      // Redis down: fail-safe to cheap routing
      return {
        agentId,
        date,
        totalSpend: 0,
        hardTierSpend: 0,
        dailyCap: budget.dailyCap,
        usedPercent: 0,
        hardUsedPercent: 0,
        constraint: "force_cheap",
      };
    }
  }

  /**
   * Reserve estimated cost before inference call.
   */
  async reserveBudget(
    agentId: string,
    estimatedCost: number,
    tier: Tier,
  ): Promise<void> {
    const date = todayUTC();

    try {
      await this.kv.incrByFloat(dailyKey(agentId, date), estimatedCost);
      if (tier === "hard") {
        await this.kv.incrByFloat(hardKey(agentId, date), estimatedCost);
      }
    } catch {
      // Silently fail — budget tracking is best-effort.
      // getBudgetState will return force_cheap if Redis is down.
    }
  }

  /**
   * Adjust budget after inference completes with actual cost.
   * delta = actualCost - estimatedCost (can be negative).
   */
  async adjustBudget(
    agentId: string,
    actualCost: number,
    estimatedCost: number,
    tier: Tier,
  ): Promise<void> {
    const delta = actualCost - estimatedCost;
    if (delta === 0) return;

    const date = todayUTC();

    try {
      await this.kv.incrByFloat(dailyKey(agentId, date), delta);
      if (tier === "hard") {
        await this.kv.incrByFloat(hardKey(agentId, date), delta);
      }
    } catch {
      // Best-effort — same rationale as reserveBudget.
    }
  }

  /**
   * Sum all agent spend for a given date. Used for monitoring/alerting.
   */
  async getGlobalSpend(date?: string): Promise<number> {
    const d = date ?? todayUTC();

    try {
      // Match daily keys but exclude `:hard` suffixed keys
      const keys = await this.kv.scan(`cortex:budget:*:${d}`);
      const dailyKeys = keys.filter((k) => !k.endsWith(":hard"));

      if (dailyKeys.length === 0) return 0;

      const values = await Promise.all(dailyKeys.map((k) => this.kv.get(k)));
      return values.reduce((sum, v) => sum + v, 0);
    } catch {
      return 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a BudgetTracker instance.
 *
 * - With a Redis URL: uses Upstash REST client.
 * - Without: uses an in-memory Map (local dev / tests).
 */
export function createBudgetTracker(redisUrl?: string): BudgetTracker {
  const kv = redisUrl ? redisKV(redisUrl) : memoryKV();
  return new BudgetTracker(kv);
}
