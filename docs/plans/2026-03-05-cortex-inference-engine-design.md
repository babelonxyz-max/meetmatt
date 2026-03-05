# Cortex: MeetMatt Inference Engine

## Design Document — 2026-03-05

---

## 1. Problem Statement

MeetMatt wraps OpenClaw to deploy AI agents at $5/day ($150/mo) or $3/day (~$90/mo annual) per agent. Every agent request currently hits the same expensive model path regardless of complexity. A "what time is it?" costs the same as "analyze this 50-page contract." Without routing infrastructure, a power user can burn through the entire day's margin in hours. As MeetMatt scales from hundreds to thousands of agents (with fleet mode targeting 10K+), uncontrolled inference cost is an existential threat to unit economics.

**Root causes:**
- No complexity-aware model selection
- No per-agent budget tracking or spend caps
- No context compression — conversations grow unbounded
- No multi-provider failover — single point of failure
- No observability — can't measure cost vs quality per request

## 2. Target Goals

| Goal | Metric | Target |
|------|--------|--------|
| Cost per agent-day | Inference spend / active agent | < $1.50 (70%+ gross margin at $5/day) |
| Quality preservation | User satisfaction / task completion | >= 95% of single-model baseline |
| Uptime | Successful response rate | >= 99.9% |
| Latency (p95) | Time to first token | < 3s for easy, < 8s for hard |
| Budget safety | Zero runaway spend incidents | 0 agents exceeding daily cap |
| Observability | Cost attribution coverage | 100% of requests tracked |

## 3. Proposed Architecture

### 3.1 The Cortex

A **Cortex** is a composable inference configuration that defines how a product tier routes, budgets, compresses, and fails over. Different products get different Cortexes:

```
┌─────────────────────────────────────────────────────────┐
│                    MeetMatt Platform                     │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────────┐   │
│  │   Agent DB   │  │     Cortex Registry             │   │
│  │  (Prisma)    │  │  matt-consumer | planck-emp |   │   │
│  │              │  │  fleet-swarm | marketplace      │   │
│  └──────┬───────┘  └──────────────┬──────────────────┘   │
│         │                         │                      │
│  ┌──────▼─────────────────────────▼──────────────────┐   │
│  │              Inference Gateway                     │   │
│  │                                                    │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │ Classifier  │  │ Budget       │  │ Context   │  │   │
│  │  │ (heuristic  │  │ Tracker      │  │ Manager   │  │   │
│  │  │  + upgrade) │  │ (Redis)      │  │ (compress)│  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │   │
│  │         │                │                │        │   │
│  │  ┌──────▼────────────────▼────────────────▼─────┐  │   │
│  │  │              Model Router                     │  │   │
│  │  │  ┌─────────────────────────────────────────┐  │  │   │
│  │  │  │         Provider Adapter Layer           │  │  │   │
│  │  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐  │  │  │   │
│  │  │  │  │OpenAI│ │Anthr.│ │Google│ │Local   │  │  │  │   │
│  │  │  │  │      │ │      │ │      │ │Qwen    │  │  │  │   │
│  │  │  │  └──────┘ └──────┘ └──────┘ └────────┘  │  │  │   │
│  │  │  └─────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                    │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Circuit Breaker (per provider, 60s window)  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Observability Layer                     │    │
│  │  request_log | cost_ledger | quality_signals      │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Integration Point: OpenClaw Provider Override

OpenClaw supports custom `models.providers` with a `baseUrl` override. The Inference Gateway exposes an OpenAI-compatible `/v1/chat/completions` endpoint. OpenClaw agents point their provider config at this endpoint instead of directly at OpenAI/Anthropic. The gateway then handles routing, budgeting, and failover transparently.

```
OpenClaw Agent → Gateway (localhost:8200/v1/chat/completions) → Actual Provider
```

This means zero changes to OpenClaw agent code. The gateway is a transparent proxy that adds intelligence.

### 3.3 Cortex Configuration Schema

```typescript
interface Cortex {
  id: string;                    // "matt-consumer"
  name: string;                  // "Matt Consumer"

  // Model ladder — ordered by preference within each tier
  models: {
    easy: ProviderModel[];       // Cheapest models for simple requests
    medium: ProviderModel[];     // Mid-tier for moderate complexity
    hard: ProviderModel[];       // Premium for complex tasks
  };

  // Budget envelope
  budget: {
    dailyCap: number;            // USD — hard daily limit
    hardTierMaxPercent: number;  // Max % of budget for hard-tier models
    thresholds: {
      biasTowardCheap: number;   // At this % spent, prefer easy tier
      forceCheap: number;        // At this % spent, force easy tier only
      failClosed: number;        // At this %, stop serving (1.0 = 100%)
    };
  };

  // Context management
  context: {
    maxInputTokens: number;      // Per-request input cap
    conversationWindow: number;  // Max total context before compression
    compressionTrigger: number;  // Token count that triggers summarization
    compressionTarget: number;   // Target size after compression
    strategy: "sliding-window" | "summarize" | "hierarchical";
  };

  // Classification
  classifier: {
    strategy: "heuristic" | "model" | "hybrid";
    // Heuristic thresholds
    easyMaxInputTokens: number;
    hardMinInputTokens: number;
    hardKeywords: string[];      // ["analyze", "compare", "write code", ...]
    // Upgrade via model (Phase 2+)
    classifierModel?: string;    // Small fast model for classification
  };

  // Failover
  failover: {
    retries: number;             // Per-provider retries with exponential backoff
    crossProvider: boolean;      // Try alternate provider on failure
    cascadeDown: boolean;        // If hard fails, try medium; medium fails, try easy
    circuitBreaker: {
      failureThreshold: number;  // % failures in window to trip
      windowSeconds: number;     // Measurement window
      cooldownSeconds: number;   // How long to exclude tripped provider
    };
    failClosedMessage: string;   // User-facing message when all options exhausted
  };
}

interface ProviderModel {
  provider: "openai" | "anthropic" | "google" | "deepseek" | "local";
  model: string;                // "gpt-4.1-nano", "claude-haiku-4-5", etc.
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  maxTokens: number;            // Output limit
  latencyClass: "fast" | "medium" | "slow";
}
```

## 4. Request Routing Policy

### 4.1 Classification Rules

Every inbound request is scored into `easy | medium | hard`:

**Heuristic classifier (Phase 1 — zero latency overhead):**

| Signal | Easy | Medium | Hard |
|--------|------|--------|------|
| Input tokens | < 200 | 200-2000 | > 2000 |
| Output expectation | Short answer | Paragraph | Multi-paragraph, structured |
| Keywords absent | "analyze", "compare", "write", "create", "debug" | — | Present |
| Tool calls | 0-1 simple | 1-3 | 3+ or chained |
| Conversation depth | < 5 turns | 5-15 turns | > 15 turns |
| Code blocks in input | None | Small snippet | Large block |

**Scoring formula:**
```
score = 0
score += token_score(input_tokens)          // 0, 1, or 2
score += keyword_score(message)             // 0 or 2
score += tool_score(requested_tools)        // 0, 1, or 2
score += depth_score(conversation_turns)    // 0, 1, or 2

if score <= 1: tier = "easy"
if score 2-4: tier = "medium"
if score >= 5: tier = "hard"
```

**Budget-adjusted routing:**
```
budget_used = get_daily_spend(agent_id) / cortex.budget.dailyCap

if budget_used >= cortex.budget.thresholds.failClosed:
  → return fail_closed_response()

if budget_used >= cortex.budget.thresholds.forceCheap:
  → tier = "easy" (regardless of classification)

if budget_used >= cortex.budget.thresholds.biasTowardCheap:
  → tier = min(tier, "medium") (cap at medium)

// Hard tier guard
hard_spend = get_daily_hard_spend(agent_id) / cortex.budget.dailyCap
if hard_spend >= cortex.budget.hardTierMaxPercent:
  → tier = min(tier, "medium")
```

### 4.2 Model Selection Within Tier

Once a tier is selected, choose the first available model from the tier's provider list:

```
for model in cortex.models[tier]:
  if circuit_breaker.is_open(model.provider):
    continue
  if within_rate_limits(model.provider):
    return model

// All models in tier exhausted — cascade down
if cortex.failover.cascadeDown and tier != "easy":
  return select_model(lower_tier)

// All options exhausted
return fail_closed()
```

### 4.3 Context Preparation

Before sending to the model:

```
1. Get conversation history for this agent session
2. If total_tokens > cortex.context.compressionTrigger:
   a. Summarize old turns (keep last N verbatim)
   b. Target: cortex.context.compressionTarget tokens
3. If input_tokens > cortex.context.maxInputTokens:
   a. Truncate oldest context first
   b. Always preserve: system prompt + last 3 turns
4. Apply prompt caching headers if provider supports it
```

## 5. Budget Policy

### 5.1 Envelope Formulas

```
REVENUE_PER_AGENT_DAY = $5.00 (monthly) or $3.00 (annual)
TARGET_MARGIN = 0.70 (70%)
INFERENCE_BUDGET = REVENUE * (1 - TARGET_MARGIN)

matt-consumer:
  dailyCap = $5.00 * 0.30 = $1.50/day
  hardTierMaxPercent = 0.20 (max 20% of daily cap = $0.30 on premium)

planck-employee (future — pricing TBD):
  dailyCap = TBD
  hardTierMaxPercent = 0.35 (more complex tasks allowed)

fleet-swarm (future — pricing TBD):
  dailyCap = $0.30/day (ultra-cheap, mostly local Qwen)
  hardTierMaxPercent = 0.05
```

### 5.2 Budget Tracking (Redis)

```
Keys:
  budget:{agent_id}:daily:{YYYY-MM-DD}       → total spend (float, TTL 48h)
  budget:{agent_id}:daily:{YYYY-MM-DD}:hard   → hard-tier spend (float, TTL 48h)
  budget:global:daily:{YYYY-MM-DD}             → platform total spend (float, TTL 48h)
  budget:global:monthly:{YYYY-MM}              → platform monthly spend (float, TTL 35d)

Operations per request:
  1. Pre-flight: READ agent daily spend → compare to thresholds
  2. Pre-flight: ESTIMATE cost (input_tokens * price + estimated_output * price)
  3. Reserve estimated amount (INCR)
  4. Post-response: Adjust to actual cost (INCR delta)
```

### 5.3 Global Guardrails

```
GLOBAL_DAILY_CAP = active_agents * $2.00 (safety buffer above per-agent cap)
GLOBAL_MONTHLY_CAP = GLOBAL_DAILY_CAP * 31

If global daily spend >= GLOBAL_DAILY_CAP * 0.90:
  → Alert ops team
  → Force all agents to "easy" tier

If global daily spend >= GLOBAL_DAILY_CAP:
  → Emergency: fail-closed for non-premium agents
  → Alert ops team immediately
```

### 5.4 Degradation Thresholds (matt-consumer)

| Budget Used | Behavior |
|------------|----------|
| 0-50% | Normal routing (easy/medium/hard based on classifier) |
| 50-80% | Bias toward cheap: cap at medium tier max |
| 80-95% | Force cheap: only easy tier models |
| 95-100% | Fail closed: "Daily assistance limit reached. Resets at midnight UTC." |

## 6. Model Combinations by Use Case

### 6.1 Phase 1: API-Only (Launch)

**matt-consumer Cortex:**

| Tier | Primary | Fallback | Cost/typical turn | Cost/heavy turn |
|------|---------|----------|-------------------|-----------------|
| Easy | GPT-4.1-nano ($0.10/$0.40) | Gemini 2.0 Flash ($0.10/$0.40) | $0.00013 | $0.0016 |
| Medium | GPT-4.1-mini ($0.40/$1.60) | DeepSeek V3.2 ($0.28/$0.42) | $0.00052 | $0.0064 |
| Hard | GPT-4.1 ($2.00/$8.00) | Claude Sonnet 4.6 ($3.00/$15.00) | $0.0026 | $0.032 |

**Expected daily cost per agent (30 interactions/day, 70/25/5 split):**
```
Easy:   21 turns * $0.00013 = $0.0027
Medium:  7 turns * $0.00052 = $0.0036
Hard:    2 turns * $0.0026  = $0.0052
────────────────────────────────
Total:                        $0.0115/day (~$0.35/month)
```

**Margin: 99.8%** — Even at 10x this usage, margin stays above 95%.

**Power user (100 interactions/day, 70/25/5 split):**
```
Easy:   70 turns * $0.00013 = $0.0091
Medium: 25 turns * $0.00052 = $0.0130
Hard:    5 turns * $0.0026  = $0.0130
────────────────────────────────
Total:                        $0.0351/day (~$1.05/month)
```

**Even power users are dirt cheap with proper routing.**

**Worst case: adversarial user (500 heavy turns/day, all classified "hard"):**
```
500 * $0.032 = $16.00/day — OVER BUDGET
```

**This is exactly why the budget cap exists.** At $1.50/day cap:
- After ~47 heavy hard-tier turns, the agent hits 100% budget
- After ~23 heavy hard-tier turns (50%), routing biases to cheap
- With budget controls, worst-case cost = $1.50/day (the cap)

### 6.2 Phase 2: Local Qwen Added

**matt-consumer Cortex (with Qwen):**

| Tier | Primary | Fallback | Cost/typical turn |
|------|---------|----------|-------------------|
| Easy | Local Qwen 32B (near-$0) | GPT-4.1-nano ($0.10/$0.40) | ~$0.00002 |
| Medium | GPT-4.1-mini ($0.40/$1.60) | DeepSeek V3.2 ($0.28/$0.42) | $0.00052 |
| Hard | GPT-4.1 ($2.00/$8.00) | Claude Sonnet 4.6 ($3.00/$15.00) | $0.0026 |

**fleet-swarm Cortex (with Qwen):**

| Tier | Primary | Fallback |
|------|---------|----------|
| Easy | Local Qwen 32B | Local Qwen 7B |
| Medium | Local Qwen 72B | GPT-4.1-nano |
| Hard | GPT-4.1-mini | DeepSeek V3.2 |

At scale with 10,000 fleet agents running 90% on local Qwen, the per-agent cost approaches near-zero for easy tasks.

### 6.3 Why These Specific Models

| Model | Why It's Here |
|-------|---------------|
| GPT-4.1-nano | $0.10/$0.40 — cheapest commercial API model with 1M context, 90% cache discount |
| Gemini 2.0 Flash | Identical pricing tier to nano, different provider for redundancy |
| GPT-4.1-mini | 4x the quality of nano at 4x the price — the sweet spot for "needs some reasoning" |
| DeepSeek V3.2 | $0.28/$0.42 with 90% cache discount — excellent quality/price ratio, different provider |
| GPT-4.1 | Full-tier model at $2/$8 — handles complex multi-step tasks |
| Claude Sonnet 4.6 | Premium fallback, different provider, excels at nuanced/creative tasks |
| Local Qwen 32B | Runs on single RTX 5090/4090, ~61 tok/s, good function calling, near-zero marginal cost |

## 7. Context Cost Controls

### 7.1 Strategies by Tier

| Tier | Max Input | Conversation Window | Compression Strategy |
|------|-----------|--------------------|--------------------|
| Easy | 4K tokens | 8K total | Sliding window (last 5 turns) |
| Medium | 16K tokens | 32K total | Summarize after 10 turns |
| Hard | 32K tokens | 64K total | Hierarchical: summary + last 8 verbatim |

### 7.2 Compression Implementation

```
Every 8-10 exchanges:
  1. Take turns older than the last 5
  2. Summarize into a compact representation using the EASY tier model
     (summarization itself is a cheap, easy task)
  3. Replace old turns with summary
  4. Expected compression: 60-70% token reduction
  5. Store summary in agent session memory

Hierarchical memory (hard tier):
  - Short-term: last 5-8 turns verbatim
  - Medium-term: summarized blocks (compressed 3-4x)
  - Long-term: key facts extracted from session (entities, decisions, preferences)
```

### 7.3 Prompt Caching

All system prompts and agent personality configs are cached aggressively:
- OpenAI: 75-90% discount on cached input
- Anthropic: 90% discount on cache reads
- System prompts are identical across requests for the same agent, so cache hit rate should be near 100%

**Impact**: A 2K token system prompt at GPT-4.1 prices:
- Uncached: $0.004 per request
- Cached: $0.001 per request (75% savings)
- Over 100 requests/day: saves $0.30/day per agent

## 8. Failover Logic

### 8.1 Retry Policy

```
Per-request retry chain:
  1. Try primary model for the tier
  2. On failure (5xx, 408, 429, timeout):
     a. Wait: min(base_delay * 2^attempt, 5000ms)
     b. Retry same model (max 2 retries)
  3. On persistent failure:
     a. Try fallback model in same tier (different provider)
  4. On fallback failure:
     a. If cascadeDown enabled: try next lower tier
  5. All options exhausted:
     a. Return fail-closed response
```

### 8.2 Circuit Breaker

```
Per-provider circuit breaker:
  - Window: 60 seconds
  - Failure threshold: 40% of requests failing
  - Action: Remove provider from routing pool
  - Cooldown: 120 seconds
  - Half-open: After cooldown, allow 1 probe request
  - If probe succeeds: close breaker (restore to pool)
  - If probe fails: re-open for another cooldown period
```

### 8.3 Fail-Closed Behavior

When all models and fallbacks are exhausted:

```json
{
  "response": "I'm experiencing temporary difficulties. Please try again in a moment.",
  "metadata": {
    "fail_reason": "all_providers_exhausted",
    "retry_after_seconds": 30
  }
}
```

When daily budget is exhausted:

```json
{
  "response": "You've reached today's assistance limit. Your allowance resets at midnight UTC. Need more? Contact support.",
  "metadata": {
    "fail_reason": "daily_budget_exhausted",
    "resets_at": "2026-03-06T00:00:00Z"
  }
}
```

## 9. Observability

### 9.1 Per-Request Log Entry

Every request through the gateway logs:

```typescript
interface RequestLog {
  // Identity
  requestId: string;
  agentId: string;
  cortexId: string;
  timestamp: string;

  // Classification
  classifiedTier: "easy" | "medium" | "hard";
  actualTier: "easy" | "medium" | "hard";  // May differ if budget-adjusted
  classificationScore: number;
  budgetAdjusted: boolean;

  // Model
  provider: string;
  model: string;
  wasFailover: boolean;
  failoverChain: string[];  // Models tried before success

  // Tokens
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  contextCompressed: boolean;
  originalContextTokens: number;  // Before compression

  // Cost
  estimatedCostUsd: number;       // Pre-flight estimate
  actualCostUsd: number;          // Post-response actual
  dailyBudgetUsedPercent: number;

  // Performance
  latencyMs: number;
  timeToFirstTokenMs: number;

  // Quality signals
  responseLength: number;
  userFollowedUp: boolean;        // Did user ask again immediately? (quality proxy)
  errorOccurred: boolean;
}
```

### 9.2 Quality vs Cost Metrics

**Dashboard metrics (daily/weekly/monthly):**

| Metric | Formula | Target |
|--------|---------|--------|
| Cost per agent-day | total_spend / active_agent_days | < $1.50 |
| Effective cost per turn | total_spend / total_requests | < $0.005 |
| Easy tier % | easy_requests / total_requests | > 65% |
| Hard tier % | hard_requests / total_requests | < 10% |
| Budget exhaustion rate | agents_hitting_cap / active_agents | < 2% |
| Failover rate | failover_requests / total_requests | < 5% |
| Circuit breaker trips | trips_per_day / providers | < 2/provider/day |
| Re-ask rate | immediate_followups / total_requests | < 15% (quality proxy) |
| p95 latency | 95th percentile TTFT | < 3s easy, < 8s hard |
| Cache hit rate | cached_input_tokens / total_input_tokens | > 60% |

### 9.3 Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| Global spend spike | Daily spend > 150% of expected | Critical |
| Provider down | Circuit breaker open > 5 min | High |
| Budget exhaustion spike | > 10% of agents hitting cap in 1 hour | Medium |
| Quality degradation | Re-ask rate > 25% over 1 hour window | Medium |
| Cache miss spike | Cache hit rate < 30% over 1 hour | Low |

## 10. Worst-Case Cost Simulation Framework

### 10.1 Variables

```
A = number of active agents
R = average requests per agent per day
S = split ratio [easy%, medium%, hard%]
C_e, C_m, C_h = cost per request by tier (from model pricing)
B = daily budget cap per agent
```

### 10.2 Scenarios

**Scenario: 500 agents, normal usage**
```
A=500, R=30, S=[70,25,5]
Daily cost = 500 * (21*$0.00013 + 7.5*$0.00052 + 1.5*$0.0026)
           = 500 * $0.0115
           = $5.75/day | $172.50/month
Revenue    = 500 * $5.00/day = $2,500/day
Margin     = 99.8%
```

**Scenario: 1000 agents, heavy usage**
```
A=1000, R=100, S=[60,30,10]
Daily cost = 1000 * (60*$0.00013 + 30*$0.00052 + 10*$0.0026)
           = 1000 * $0.0494
           = $49.40/day | $1,482/month
Revenue    = 1000 * $5.00/day = $5,000/day
Margin     = 99.0%
```

**Scenario: 1000 agents, adversarial (capped)**
```
A=1000, all hitting budget cap
Daily cost = 1000 * $1.50 (cap)
           = $1,500/day | $45,000/month
Revenue    = 1000 * $5.00/day = $5,000/day
Margin     = 70.0% — MINIMUM ACCEPTABLE (by design)
```

**Scenario: 10,000 fleet agents (Phase 2, with local Qwen)**
```
A=10000, R=30, S=[90,9,1], easy tier on local Qwen
Daily cost = 10000 * (27*$0.00002 + 2.7*$0.00052 + 0.3*$0.0026)
           = 10000 * $0.002694
           = $26.94/day + GPU costs (~$50-100/day for Qwen cluster)
           ≈ $77-127/day | $2,310-3,810/month
Revenue    = pricing TBD (fleet likely < $5/agent/day)
```

### 10.3 Simulation Test Script

Build a script that:
1. Takes: agent_count, requests_per_day, split_ratios, model_prices, budget_cap
2. Simulates N days with random request patterns
3. Outputs: daily cost, budget exhaustion events, failover events, margin
4. Runs against real pricing data (use the compiled JSON at `/Users/mark/llm-pricing-march-2026.json`)

## 11. Rollout Plan

### Phase 0: Foundation (Week 1-2)

**Goal:** Build the gateway skeleton and budget tracking.

- [ ] Set up Redis (Upstash or Railway Redis)
- [ ] Create `lib/cortex/` module structure:
  - `types.ts` — Cortex, ProviderModel, RequestLog interfaces
  - `registry.ts` — Cortex configuration registry
  - `classifier.ts` — Heuristic request classifier
  - `budget.ts` — Redis-based budget tracker
  - `router.ts` — Model selection logic
  - `gateway.ts` — OpenAI-compatible proxy endpoint
- [ ] Create `matt-consumer` Cortex config (JSON/code)
- [ ] Prisma migration: add `cortexId` field to Agent model
- [ ] API route: `POST /api/v1/chat/completions` (the gateway endpoint)
- [ ] Wire budget tracking: pre-flight check + post-response adjustment
- [ ] Basic request logging to database (or structured log)

### Phase 1: API-Only Routing (Week 3-4)

**Goal:** Route real traffic through the gateway. Measure everything.

- [ ] Configure OpenClaw agents to use gateway as their provider baseUrl
- [ ] Deploy `matt-consumer` Cortex with 3-tier routing (nano / mini / 4.1)
- [ ] Implement circuit breaker for each provider
- [ ] Implement context compression (sliding window + summarization)
- [ ] Build cost dashboard (can be simple: query logs, render in backoffice)
- [ ] Run 2-week measurement period:
  - Track actual cost per agent-day
  - Track tier distribution (actual easy/medium/hard split)
  - Track failover frequency
  - Track quality via re-ask rate
  - Tune classifier thresholds based on real data

### Phase 2: Local Qwen Integration (Week 5-8)

**Goal:** Add local inference as the bottom of the model ladder.

- [ ] Provision GPU (RunPod L40S or RTX 5090 — $0.54-0.79/hr)
- [ ] Deploy Qwen 2.5 32B (Q4_K_M) via SGLang or vLLM
  - SGLang preferred: 29% faster than vLLM, RadixAttention for prefix caching
  - Expose OpenAI-compatible API endpoint
- [ ] Add `local` provider to gateway's adapter layer
- [ ] Update `matt-consumer` Cortex: insert Qwen as easy-tier primary
- [ ] Health check + auto-failover: if local Qwen is down, fall back to API models
- [ ] Measure: local Qwen quality vs API models on real traffic
- [ ] Tune: which request types Qwen handles well vs needs API escalation

### Phase 3: Multi-Product Cortexes (Week 9-12)

**Goal:** Extend to Planck employees and fleet mode.

- [ ] Design `planck-employee` Cortex (higher budget, more hard-tier allowed)
- [ ] Design `fleet-swarm` Cortex (ultra-cheap, mostly local Qwen)
- [ ] Build Cortex management UI in backoffice
- [ ] Implement marketplace Cortex (per-creator configuration)
- [ ] Scale local Qwen cluster based on demand (auto-scaling via RunPod)

### Phase 4: Intelligence Upgrade (Week 13+)

**Goal:** Replace heuristic classifier with a trained model.

- [ ] Collect labeled data from Phase 1-3 (request → actual best tier)
- [ ] Train lightweight classifier (BERT-based or small LLM fine-tune)
- [ ] A/B test: heuristic vs trained classifier
- [ ] Implement hybrid mode: heuristic fast-path + model for ambiguous cases
- [ ] Explore RouteLLM framework for preference-based routing

## 12. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Classifier routes hard requests to easy tier | Quality degradation, user churn | Medium | Conservative defaults (when in doubt, go medium). Re-ask rate monitoring triggers classifier tuning. |
| Single provider outage | Downtime for affected tier | Medium | Every tier has 2+ providers. Circuit breaker auto-removes. Cross-provider fallback. |
| Redis unavailability | No budget tracking, potential overspend | Low | Fail-closed: if Redis is down, route all to easy tier (safe default). Upstash has 99.99% SLA. |
| Power users gaming the system | Budget exhaustion early in day | Medium | Budget cap is a hard wall. Consider spreading budget across time windows (e.g., 4-hour blocks). |
| Context compression loses critical info | Wrong answers, user frustration | Medium | Always preserve last 3-5 turns verbatim. Log compression events. Measure re-ask rate after compression. |
| Local Qwen quality insufficient | Bad responses on easy tier | Medium | A/B test Qwen vs API models before full rollout. Keep API fallback always available. |
| Latency from gateway hop | Slower responses | Low | Gateway adds < 50ms overhead (classify + route). Net latency dominated by model inference. |
| Provider pricing changes | Cost model breaks | Low | Pricing data in config, not hardcoded. Monthly pricing review. Alerts on cost-per-turn drift. |

## 13. Definition of Done

### Phase 0 Complete When:
- [ ] Gateway accepts OpenAI-compatible requests and proxies to at least 2 providers
- [ ] Budget tracking works: per-agent daily spend visible in Redis
- [ ] Cortex config loaded and applied to routing decisions
- [ ] Request logs captured with all fields from the schema

### Phase 1 Complete When:
- [ ] Real OpenClaw agents route through the gateway (not direct to providers)
- [ ] 3-tier routing operational with measurable tier distribution
- [ ] Budget caps enforced: no agent exceeds $1.50/day spend
- [ ] Circuit breaker tested: provider outage doesn't cascade
- [ ] Context compression reduces average context by > 40%
- [ ] Cost dashboard shows per-agent and platform-wide spend
- [ ] 2-week data confirms: cost per agent-day < $0.50 (normal usage)
- [ ] Re-ask rate < 15% (quality baseline met)
- [ ] Zero runaway spend incidents

### Phase 2 Complete When:
- [ ] Local Qwen serving > 50% of easy-tier requests
- [ ] Quality parity: re-ask rate unchanged vs Phase 1
- [ ] Marginal cost per easy-tier request < $0.0001
- [ ] Auto-failover from local to API works under load

### Full System Complete When:
- [ ] Multiple Cortexes active (consumer, employee, fleet)
- [ ] Global spend stays within budget at 1000+ active agents
- [ ] 99.9% uptime over 30-day window
- [ ] Cost per agent-day < $1.00 at scale with local Qwen
- [ ] Ops team can modify Cortex configs without code deploy

---

## Appendix A: Pricing Reference

Full model pricing data: `/Users/mark/llm-pricing-march-2026.json`

**Key price points for routing decisions:**

| Model | Input $/M | Output $/M | Typical Turn | Heavy Turn |
|-------|-----------|------------|-------------|------------|
| GPT-4.1-nano | $0.10 | $0.40 | $0.00013 | $0.0016 |
| Gemini 2.0 Flash | $0.10 | $0.40 | $0.00013 | $0.0016 |
| GPT-4o-mini | $0.15 | $0.60 | $0.00020 | $0.0024 |
| DeepSeek V3.2 | $0.28 | $0.42 | $0.00022 | $0.0031 |
| GPT-4.1-mini | $0.40 | $1.60 | $0.00052 | $0.0064 |
| GPT-4.1 | $2.00 | $8.00 | $0.0026 | $0.032 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.0045 | $0.054 |

## Appendix B: OpenClaw Integration

OpenClaw supports custom providers via `models.providers` in `openclaw.json`:

```json
{
  "models": {
    "providers": {
      "meetmatt-gateway": {
        "baseUrl": "http://gateway.internal:8200/v1",
        "apiKey": "${MEETMATT_GATEWAY_KEY}",
        "api": "openai-completions",
        "models": {
          "matt-auto": {
            "displayName": "Matt Auto Router",
            "context": 128000
          }
        }
      }
    }
  }
}
```

The gateway receives requests as if it were OpenAI, then routes internally based on the agent's Cortex configuration.

## Appendix C: Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Gateway runtime | Node.js (same as MeetMatt) | Single stack, shared types, Vercel-compatible |
| Budget store | Redis (Upstash) | Atomic INCR, TTL for auto-cleanup, < 1ms reads |
| Local inference | SGLang + Qwen 2.5 32B | 29% faster than vLLM, RadixAttention for agent prefix caching |
| GPU provider | RunPod (Phase 2) | L40S at $0.79/hr, RTX 5090 at $0.54/hr, serverless option |
| Observability | Structured logs + Sentry | Already in stack (Sentry DSN pending). Dashboard via backoffice. |
| Circuit breaker | In-memory (gateway process) | Simple, fast. Acceptable for single-gateway topology. |

---

## Research Update (2026-03-05, Evening)

### A) Critical alignment issue discovered
Current code paths still reflect monthly-tier assumptions, while product direction is now usage/use-case based (assistant daily, employees, fleet).

Concrete examples observed in code:
- Fixed payment amount in payment creation (`price_amount: 150`).
- Tier hardcoded to `"matt"` during payment record creation.
- Payment-confirm webhook activates fixed `monthly` subscription path.

This mismatch is now a primary bottleneck because billing, entitlement, and activation logic can drift from product promises.

### B) Reliability bottlenecks (highest risk)
1. **Atomicity guarantee is not formalized end-to-end**
   - We need strict business-level exactly-once outcomes via idempotency + durable state machine.

2. **Webhook path still carries too much direct orchestration responsibility**
   - Better pattern: verify + persist + enqueue; let workers perform business actions.

3. **Queue processing depends on ops config discipline**
   - Queue exists and is good, but must be treated as first-class runtime (worker health, recovery sweeper, alerts).

4. **Known production guardrails still pending**
   - Rate limit quality and anti-spoof protections need stronger production posture.

### C) Payment roughness root causes
- No canonical billing-intent object to bind `what was sold` to `what is activated`.
- Legacy monthly assumptions still present in create + webhook + subscription helpers.
- Activation should be derived from package/use-case policies, not hardcoded monthly function.

### D) Correct architecture direction (confirmed)
Reliability-first sequence:
1. DB/source-of-truth state transitions
2. Atomic enqueue (transactional outbox equivalent)
3. Worker-led processing with lease/heartbeat
4. Idempotent external effects
5. Retry/backoff + DLQ
6. Reconciliation sweeper for stuck/orphan states

Then cost-quality optimization:
1. Smart 3-tier router (cheap -> medium -> premium)
2. Hard caps (per-user + global)
3. Premium-route percentage cap
4. Context compression before escalation

### E) API-first spend test strategy (before local Qwen)
Approved approach:
- Run controlled API-only phase to measure true heavy-usage ceiling with hard budgets.
- Log every route decision + token/cost/latency + task-success signal.
- Add local Qwen after baseline is known, replacing Tier A/B traffic for savings.

### F) Decision guardrails for product architecture workshop
The following must be finalized before implementation:
1. Package model and entitlement units:
   - assistant daily,
   - employees,
   - fleet.
2. Budget policy values:
   - per-user daily/monthly caps,
   - global daily/monthly stop-loss,
   - premium escalation ceiling.
3. SLA targets by use case (assistant vs employees vs fleet).
4. Billing intent schema and activation policy mapping.

### G) Definition of done (platform-level)
- No orphan paid intents past SLA.
- No missed critical jobs (all either completed or explicitly failed with reason).
- Idempotent replays safe across webhooks/workers.
- Spend remains within configured hard caps under load tests.
- Task-success maintained with router policy.

