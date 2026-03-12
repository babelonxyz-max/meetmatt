# MeetMatt Agent Capability Commerce Architecture (v2 - Elevated)

**Date:** March 6, 2026
**Status:** Proposed implementation architecture (elevated with engineering review)
**Audience:** CTO / product architecture / implementation
**Changelog:** v2 adds concrete Prisma schema, Cortex integration, NOWPayments integration, migration strategy, performance design, security model, event architecture, error handling, and end-to-end flow diagrams missing from v1.

---

## Engineering Review of v1

Before the elevated architecture, here is a structured gap analysis:

| Area | v1 Coverage | Gap |
|---|---|---|
| Data model | 16 entity names listed | No Prisma schema, no field definitions, no relations, no indexes |
| Existing codebase integration | Not addressed | No plan for how current Agent model (50+ fields), NOWPayments, Cortex, Telethon integrate |
| Migration strategy | Not addressed | No plan for transitioning existing agents to use-case templates |
| Performance | Not addressed | No caching for loadout resolution, no hot-path optimization for usage checks |
| Concurrency | Not addressed | No race condition handling for concurrent usage decrement |
| Event architecture | Not addressed | No pub/sub, webhooks, or event sourcing for usage/entitlement changes |
| Security | Not addressed | No multi-tenant entitlement isolation, no authorization model |
| Error handling | "Fall back to cheaper" mentioned | No circuit breaker integration, no fallback chain failure modes |
| Observability | "Observability" listed as Matt-owned | No metrics, alerts, dashboards, or structured logging design |
| Testing | Not addressed | No testing strategy for billing/entitlement correctness |
| End-to-end flows | Not addressed | No sequence diagrams for provisioning, skill resolution, or usage metering |
| Crypto payments | Not addressed | No plan for how EntitlementPacks work with NOWPayments crypto model |

**v1 Verdict:** Strong conceptual separation (CatalogItem/SkillDefinition/SkillImplementation/EntitlementPack/AgentLoadout). Missing everything needed to actually build it. Elevating below.

---

## 1. Executive Summary

MeetMatt sells **agents by use case**, not raw tools. Each use case provisions a bundle with a role, default capabilities, included paid allowances, and default policies.

The architecture separates five concerns:
- `CatalogItem` = what the customer sees and buys
- `SkillDefinition` = what the runtime understands
- `SkillImplementation` = the concrete backend/provider/code path
- `EntitlementPack` = what was paid for
- `AgentLoadout` = what a specific agent actually has equipped

This doc covers how to build this on top of the existing MeetMatt codebase (Prisma 6.19.2, Next.js 16, Cortex inference engine, NOWPayments, Telegram Bot API, and Telethon).

## 2. Existing Codebase Anchors

Before adding anything, here's what already exists and must be integrated:

| Component | Location | Role in New Architecture |
|---|---|---|
| `Agent` model (50+ fields) | `prisma/schema.prisma` | Extend with `useCaseTemplateId`, `loadoutVersion`, and specialist tier metadata |
| `Payment` model (NOWPayments) | `prisma/schema.prisma` | Extend with `paymentPurpose`, `targetType`, `targetId` |
| `InferenceLog` model | `prisma/schema.prisma` | Already tracks per-agent cost; wire to new `UsageLedgerEntry` |
| Cortex inference engine | `lib/cortex/` (12 files) | Becomes a `SkillImplementation` for inference-backed skills |
| NOWPayments client | `lib/nowpayments.ts` | Payment flow for EntitlementPack purchases and top-ups |
| Agent blueprints | `lib/agent-blueprint.ts` | Integrate with `UseCaseTemplate` system during migration, not a flag-day replacement |
| Subscription lifecycle | `lib/subscription.ts` | Extend for entitlement reset on billing cycle |
| OpenClaw integration | `lib/reallyopenclaw.ts` | Becomes a `SkillImplementation` for interactive execution |
| Transport layer | `lib/transport-outbound.ts`, Telethon routes, bot deploy flow | Telegram Bot API remains default; Telethon remains optional extra transport |
| Budget tracking | `lib/cortex/budget.ts` | Wire to `EntitlementAllowance` checks |

## 3. Prisma Schema

The schema below is a build-aligned reference model. In implementation, it should use the repo's existing Prisma 6.19.2 conventions, enums, and naming style rather than introducing a second schema dialect.

### 3.1 New Models

```prisma
// ── Use Case Templates ──────────────────────────────────

model UseCaseTemplate {
  id                    String   @id @default(cuid())
  slug                  String   @unique     // "support-agent", "research-employee"
  name                  String               // "Support Agent"
  description           String?
  agentKind             String               // should map to existing AgentKind enum / agent family
  defaultExecutionMode  String   @default("hybrid") // should map to an enum in final schema
  defaultBrainProvider  String   @default("cortex")
  defaultWorkerTier     String?              // "standard" | "premium" | "specialist_coder" | ...
  promptSpec            Json?                // system prompt template
  guardrailSpec         Json?                // content policy defaults
  scheduleSpec          Json?                // default schedule
  memorySpec            Json?                // memory/context defaults
  approvalSpec          Json?                // human-in-the-loop defaults
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  items                 UseCaseTemplateItem[]
  entitlements          UseCaseTemplateEntitlement[]
  agents                Agent[]

  @@index([isActive])
}

model UseCaseTemplateItem {
  id                String          @id @default(cuid())
  templateId        String
  catalogItemId     String
  isDefault         Boolean         @default(true)  // included vs optional
  sortOrder         Int             @default(0)

  template          UseCaseTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  catalogItem       CatalogItem     @relation(fields: [catalogItemId], references: [id])

  @@unique([templateId, catalogItemId])
  @@index([templateId])
}

model UseCaseTemplateEntitlement {
  id                String          @id @default(cuid())
  templateId        String
  entitlementPackId String
  isIncluded        Boolean         @default(true)  // included in base vs purchasable

  template          UseCaseTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  entitlementPack   EntitlementPack @relation(fields: [entitlementPackId], references: [id])

  @@unique([templateId, entitlementPackId])
  @@index([templateId])
}

// ── Catalog (Customer-Facing) ───────────────────────────

model CatalogItem {
  id              String   @id @default(cuid())
  slug            String   @unique     // "painter", "research-pro", "crm-sync"
  name            String               // "Painter"
  description     String?
  category        String?              // "creative", "research", "integration"
  iconUrl         String?
  isAddon         Boolean  @default(false)  // can be attached separately
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  skills          CatalogItemSkill[]
  templateItems   UseCaseTemplateItem[]
  loadoutItems    AgentLoadoutItem[]

  @@index([isActive, isAddon])
}

model CatalogItemSkill {
  id              String          @id @default(cuid())
  catalogItemId   String
  skillId         String

  catalogItem     CatalogItem     @relation(fields: [catalogItemId], references: [id], onDelete: Cascade)
  skill           SkillDefinition @relation(fields: [skillId], references: [id])

  @@unique([catalogItemId, skillId])
  @@index([catalogItemId])
}

// ── Skills (Runtime) ────────────────────────────────────

model SkillDefinition {
  id              String   @id @default(cuid())
  slug            String   @unique     // "image_generation", "lead_enrichment"
  name            String
  description     String?
  category        String?              // "generation", "research", "integration"
  isMetered       Boolean  @default(false)  // true = consumes entitlement allowance
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  catalogItems    CatalogItemSkill[]
  implementations SkillImplementation[]
  bindings        AgentSkillBinding[]
  entitlementSkills EntitlementPackSkill[]

  @@index([isMetered])
}

model SkillImplementation {
  id              String   @id @default(cuid())
  skillId         String
  slug            String   @unique     // "nano_banana_free", "premium_image_v1"
  name            String
  provider        String               // "cortex", "openclaw", "native", "external"
  tier            String   @default("free") // "free", "cheap", "premium"
  costPerUnit     Decimal  @default(0) @db.Decimal(10, 6)  // USD cost per invocation
  config          Json?                // provider-specific config (model, endpoint, etc.)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  skill           SkillDefinition @relation(fields: [skillId], references: [id])

  @@index([skillId, tier, isActive])
}

// ── Entitlements (Billing) ──────────────────────────────

model EntitlementPack {
  id              String   @id @default(cuid())
  slug            String   @unique     // "painter-starter-50", "research-pro-250"
  name            String               // "Painter Starter (50 generations)"
  description     String?
  packType        String               // "included", "addon", "topup"
  priceUsd        Decimal? @db.Decimal(10, 2)
  resetPolicy     String   @default("none") // "billing_cycle", "purchase_period", "none"
  resetDays       Int?                 // for purchase_period: days until reset
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  skills          EntitlementPackSkill[]
  grants          EntitlementGrant[]
  templateEntitlements UseCaseTemplateEntitlement[]

  @@index([packType, isActive])
}

model EntitlementPackSkill {
  id              String          @id @default(cuid())
  packId          String
  skillId         String
  allowanceUnits  Int             // 50, 250, 500, -1 for unlimited access
  unitLabel       String          @default("uses") // "generations", "searches", "actions"

  pack            EntitlementPack @relation(fields: [packId], references: [id], onDelete: Cascade)
  skill           SkillDefinition @relation(fields: [skillId], references: [id])

  @@unique([packId, skillId])
  @@index([packId])
}

model EntitlementGrant {
  id              String          @id @default(cuid())
  packId          String
  agentId         String
  userId          String
  grantType       String          // "included", "purchased", "topup", "promo"
  paymentId       String?         // links to Payment if purchased
  grantedAt       DateTime        @default(now())
  expiresAt       DateTime?
  isActive        Boolean         @default(true)

  pack            EntitlementPack @relation(fields: [packId], references: [id])
  agent           Agent           @relation(fields: [agentId], references: [id])
  user            User            @relation(fields: [userId], references: [id])
  allowances      EntitlementAllowance[]

  @@index([agentId, isActive])
  @@index([userId])
}

model EntitlementAllowance {
  id              String          @id @default(cuid())
  grantId         String
  skillId         String
  totalUnits      Int             // original allowance
  usedUnits       Int             @default(0)
  resetAt         DateTime?       // next reset timestamp
  lastResetAt     DateTime?

  grant           EntitlementGrant @relation(fields: [grantId], references: [id], onDelete: Cascade)
  skill           SkillDefinition  @relation(fields: [skillId], references: [id])

  @@unique([grantId, skillId])
  @@index([grantId])
}

// ── Agent Loadout (Per-Agent State) ─────────────────────

model AgentLoadoutItem {
  id              String      @id @default(cuid())
  agentId         String
  catalogItemId   String
  equippedAt      DateTime    @default(now())
  isActive        Boolean     @default(true)

  agent           Agent       @relation(fields: [agentId], references: [id], onDelete: Cascade)
  catalogItem     CatalogItem @relation(fields: [catalogItemId], references: [id])

  @@unique([agentId, catalogItemId])
  @@index([agentId, isActive])
}

model AgentSkillBinding {
  id                  String              @id @default(cuid())
  agentId             String
  skillId             String
  implementationId    String?             // null = use fallback resolution
  overrideConfig      Json?               // per-agent overrides

  agent               Agent               @relation(fields: [agentId], references: [id], onDelete: Cascade)
  skill               SkillDefinition     @relation(fields: [skillId], references: [id])
  implementation      SkillImplementation? @relation(fields: [implementationId], references: [id])

  @@unique([agentId, skillId])
  @@index([agentId])
}

// ── Usage Tracking (Immutable Ledger) ───────────────────

model UsageLedgerEntry {
  id              String   @id @default(cuid())
  agentId         String
  userId          String
  skillId         String
  implementationId String
  grantId         String?  // null if free/unmetered
  units           Int      @default(1)
  costUsd         Decimal  @default(0) @db.Decimal(10, 6)
  tier            String   // "free", "cheap", "premium"
  timestamp       DateTime @default(now())

  @@index([agentId, timestamp])
  @@index([userId, timestamp])
  @@index([grantId])
}

model UsageDecisionLog {
  id              String   @id @default(cuid())
  agentId         String
  skillId         String
  requestedTier   String   // what was requested
  resolvedTier    String   // what actually ran
  reason          String   // "allowance_available", "fallback_exhausted", "fallback_free", "blocked"
  allowanceRemaining Int?  // remaining after this decision
  timestamp       DateTime @default(now())

  @@index([agentId, timestamp])
  @@index([reason])
}
```

### 3.2 Agent Model Extensions

Add to existing `Agent` model:

```prisma
model Agent {
  // ... existing 50+ fields ...

  // New fields
  useCaseTemplateId  String?
  loadoutVersion     Int            @default(1)
  autoTopupEnabled   Boolean        @default(false)
  autoTopupPackId    String?

  // New relations
  useCaseTemplate    UseCaseTemplate?  @relation(fields: [useCaseTemplateId], references: [id])
  loadoutItems       AgentLoadoutItem[]
  skillBindings      AgentSkillBinding[]
  entitlementGrants  EntitlementGrant[]
}
```

### 3.3 Payment Model Extensions

Add to existing `Payment` model:

```prisma
model Payment {
  // ... existing fields (NOWPayments) ...

  // New fields
  paymentPurpose     String?       // "subscription", "addon", "topup"
  targetType         String?       // "entitlement_pack", "catalog_item"
  targetId           String?       // ID of what was purchased
}
```

### 3.4 Specialist Layer Extensions

Premium specialists should be first-class in the system model, not buried inside ordinary add-ons.

Add to the final schema:

```prisma
model Agent {
  // ...
  workerTier        String?   // "standard", "premium", "specialist_coder", "specialist_research"
}

model UseCaseTemplate {
  // ...
  defaultWorkerTier String?
}
```

This is the clean place to represent:
- coders
- research analysts
- strategists
- design-heavy specialists

It keeps specialist cost/routing/policy concerns separate from simple capability add-ons.

## 4. Core Architecture Layers

### 4.1 Layer Diagram

```
Customer UX Layer
  |
  v
Catalog API Layer (what customers see/buy)
  |
  v
Loadout Resolution Layer (what an agent has equipped)
  |
  v
Skill Resolution Layer (what implementation to use)
  |
  v
Entitlement Check Layer (does the agent have allowance?)
  |
  v
Execution Layer (Cortex / OpenClaw / native)
  |
  v
Usage Ledger Layer (record what happened)
```

### 4.2 Matt-Owned Layers (must remain first-party)

- Tenancy, agent registry, use-case bundles
- Catalog items, entitlements, loadouts, worker tiers
- Permissions, approval gates, schedules
- Transport routing (Telegram Bot API, Telethon, web)
- Usage ledger, observability
- Fallback policy engine

### 4.3 External Code Policy

Rule: **Matt owns contracts, borrowed code implements Matt contracts.**

If external code works (OpenClaw, OpenFang), MeetMatt can copy/fork/vendor it, but it must be normalized under `SkillImplementation` with a Matt-owned interface.

## 5. End-to-End Flows

### 5.1 Agent Provisioning Flow

```
Customer selects "Support Agent"
  |
  v
POST /api/agents { useCaseSlug: "support-agent" }
  |
  v
[1] Resolve UseCaseTemplate by slug
  |
  v
[2] Create Agent with useCaseTemplateId
  |
  v
[3] For each default UseCaseTemplateItem:
    -> Create AgentLoadoutItem
    -> For each CatalogItemSkill:
       -> Create AgentSkillBinding (implementationId = null, use fallback)
  |
  v
[4] For each included UseCaseTemplateEntitlement:
    -> Create EntitlementGrant (grantType = "included")
    -> For each EntitlementPackSkill:
       -> Create EntitlementAllowance (usedUnits = 0)
  |
  v
[5] Trigger existing deploy flow (deploy-jobs, Telethon identity, etc.)
  |
  v
Agent is live with full loadout + entitlements
```

### 5.2 Skill Execution Flow (Hot Path)

This runs on every agent action that invokes a metered skill. Must be fast.

```
Agent needs to invoke skill "image_generation"
  |
  v
[1] Check AgentSkillBinding for this agent + skill
    -> If binding has implementationId, use it
    -> Otherwise, enter fallback resolution
  |
  v
[2] Fallback Resolution (FallbackPolicy):
    a. Find all SkillImplementations for this skill, ordered by tier DESC
    b. For "premium" tier:
       -> Reserve allowance atomically (Redis DECR or atomic SQL UPDATE)
       -> If reservation succeeds: use premium, proceed to [3]
       -> If no: check for active top-up grant
       -> If no top-up: continue to next tier
    c. For "cheap" tier:
       -> Check if cheap impl exists and is active
       -> Use it, proceed to [3]
    d. For "free" tier:
       -> Use free impl, proceed to [3]
    e. If no impl available: block + prompt for purchase
  |
  v
[3] Execute via implementation provider
    -> provider = "cortex": route through Cortex gateway (existing lib/cortex/)
    -> provider = "openclaw": route through OpenClaw (existing lib/reallyopenclaw.ts)
    -> provider = "native": call internal function directly
  |
  v
[4] Finalize usage:
    -> Insert UsageLedgerEntry
    -> Insert UsageDecisionLog (if fallback occurred)
    -> If execution failed after premium reservation:
       -> refund or compensate the reserved allowance
       -> mark failure in ledger/decision log
  |
  v
[5] If fallback happened (resolved tier != requested tier):
    -> Notify customer via existing transport (Telethon/web)
    -> Include: what happened, remaining allowance, top-up CTA
```

### 5.3 Add-on Attach Flow

```
Customer clicks "Add Painter" on agent dashboard
  |
  v
POST /api/agents/:id/addons { catalogItemSlug: "painter" }
  |
  v
[1] Verify CatalogItem exists and isAddon = true
  |
  v
[2] Check if agent already has this item (idempotent)
  |
  v
[3] Initiate payment via NOWPayments (existing flow)
    -> paymentPurpose = "addon"
    -> targetType = "entitlement_pack"
    -> targetId = pack.id
  |
  v
[4] On payment confirmation webhook:
    a. Create AgentLoadoutItem
    b. Create AgentSkillBindings for all CatalogItemSkills
    c. Create EntitlementGrant + EntitlementAllowances
  |
  v
[5] Agent now has new capability, immediately available
```

### 5.4 Top-up Flow

```
Premium allowance exhausted (or at 80% threshold)
  |
  v
[1] Proactive notification at 80%:
    -> "Your Painter has 10 premium generations remaining"
    -> Include top-up CTA
  |
  v
[2] At exhaustion:
    -> If autoTopupEnabled: initiate payment automatically
    -> If not: send exhaustion notification with top-up/auto-enable options
  |
  v
[3] Top-up payment via NOWPayments:
    -> paymentPurpose = "topup"
    -> On confirmation: create new EntitlementGrant with fresh allowance
  |
  v
[4] If no top-up: fallback chain activates on next skill invocation
```

## 6. Performance Design

### 6.1 Loadout Cache

Loadout resolution happens on every agent action. Must not hit the database every time.

```typescript
// lib/loadout-cache.ts
// Cache structure: agentId -> resolved loadout
// Storage: Redis (UPSTASH_REDIS_REST_URL) with 5-minute TTL
// Invalidation: on loadout change (add-on attach, entitlement grant)

interface CachedLoadout {
  agentId: string;
  version: number;
  items: { catalogItemId: string; skillSlugs: string[] }[];
  skills: { skillId: string; implementationId: string | null }[];
  cachedAt: number;
}

// Fallback if Redis is down: in-memory LRU (100 agents, 60s TTL)
```

### 6.2 Entitlement Check (Hot Path Optimization)

The allowance check (`usedUnits < totalUnits`) runs on every metered skill invocation. Two strategies:

**Strategy A: Redis counter (recommended for launch)**
- On entitlement grant: set Redis key `ent:{grantId}:{skillId}` = totalUnits
- On each use: `DECR` the key before execution as a reservation (atomic, no race conditions)
- On zero: trigger exhaustion flow
- On execution failure after reservation: compensate with `INCR` and log refund
- Sync to Prisma `EntitlementAllowance.usedUnits` async (every 60s or on significant events)
- On Redis failure: fall back to direct Prisma query with `UPDATE ... SET usedUnits = usedUnits + 1 WHERE usedUnits < totalUnits` (row-level lock)

**Strategy B: Prisma-only with optimistic locking (fallback)**
```sql
UPDATE "EntitlementAllowance"
SET "usedUnits" = "usedUnits" + 1
WHERE id = $1 AND "usedUnits" < "totalUnits"
RETURNING "usedUnits", "totalUnits";
```
Returns 0 rows affected if exhausted. No race conditions due to atomic UPDATE with WHERE clause. This UPDATE acts as the reservation step before execution.

### 6.3 Usage Ledger (Write-Optimized)

- `UsageLedgerEntry` is append-only (never updated)
- Batch inserts: buffer up to 10 entries or 5 seconds, then bulk insert
- Partition by month if volume exceeds 1M rows/month (not needed at launch)
- Index on `(agentId, timestamp)` for per-agent queries
- Index on `(userId, timestamp)` for billing queries

## 7. Concurrency and Race Conditions

### 7.1 Allowance Decrement

**Problem:** Two concurrent requests for the same metered skill could both read `usedUnits = 49` (of 50), both proceed, resulting in 51 uses.

**Solution:** Atomic Redis DECR (Strategy A) or atomic SQL UPDATE with WHERE (Strategy B). Both are race-free.

### 7.2 Loadout Mutation During Execution

**Problem:** An add-on is attached while an agent action is mid-execution.

**Solution:** Loadout version number. Execution uses the loadout snapshot taken at action start. New capabilities become available on next action.

### 7.3 Payment Confirmation Race

**Problem:** NOWPayments webhook fires twice for the same payment (idempotency issue).

**Solution:** Unique constraint on `(paymentId, grantType)` in EntitlementGrant. Second insert fails silently.

## 8. Cortex Integration

Cortex already tracks per-agent inference cost ($1.50/day budget). The new architecture wires this into the entitlement system:

### 8.1 Cortex as SkillImplementation

```typescript
// Seed data for inference-backed skills
const cortexImplementations = [
  {
    skillSlug: "conversation_core",
    slug: "cortex_conversation_v1",
    provider: "cortex",
    tier: "premium", // uses Cortex budget
    config: { cortexId: "matt-consumer", minTier: "easy" }
  },
  {
    skillSlug: "research_query",
    slug: "cortex_research_v1",
    provider: "cortex",
    tier: "premium",
    config: { cortexId: "matt-consumer", minTier: "medium" }
  }
];
```

### 8.2 Budget Bridge

Cortex's existing `$1.50/day` budget (in `lib/cortex/budget.ts`) becomes the **inference entitlement**:
- `EntitlementPack` "cortex-daily-budget" with `resetPolicy: "billing_cycle"`
- `EntitlementAllowance` tracks daily inference spend in USD cents
- Cortex's existing budget check calls the new `EntitlementAllowance` check
- This unifies all metering under one system

### 8.3 Fallback: Cortex Tier Downgrade

When an agent's inference budget is exhausted:
1. Cortex already falls back to cheaper models (Hard -> Medium -> Easy)
2. New: if daily budget fully spent, fall back to `nano` tier (cheapest available)
3. New: log `UsageDecisionLog` with `reason: "budget_exhausted_daily"`
4. New: notify customer via transport

## 9. NOWPayments Integration

### 9.1 Purchase Flows

The existing `lib/nowpayments.ts` handles crypto payment creation and webhook verification. Extend for:

```typescript
// New payment creation for add-ons and top-ups
async function createEntitlementPayment(params: {
  userId: string;
  agentId: string;
  packSlug: string;
  purpose: "addon" | "topup";
}): Promise<PaymentSession> {
  const pack = await prisma.entitlementPack.findUniqueOrThrow({
    where: { slug: params.packSlug }
  });

  const payment = await createNowPayment({
    amount: Number(pack.priceUsd),
    currency: "usd",
    orderId: `${params.purpose}_${params.agentId}_${pack.slug}_${Date.now()}`,
    // ... existing NOWPayments params
  });

  await prisma.payment.create({
    data: {
      userId: params.userId,
      sessionId: payment.id,
      amount: pack.priceUsd,
      status: "pending",
      paymentPurpose: params.purpose,
      targetType: "entitlement_pack",
      targetId: pack.id,
    }
  });

  return payment;
}
```

### 9.2 Webhook Handler Extension

Extend existing `/api/webhooks/payment` to handle entitlement provisioning on confirmation:

```typescript
// After payment confirmed (existing flow)
if (payment.paymentPurpose === "addon" || payment.paymentPurpose === "topup") {
  await provisionEntitlement({
    agentId: getAgentFromOrder(payment.orderId),
    userId: payment.userId,
    packId: payment.targetId,
    grantType: payment.paymentPurpose === "addon" ? "purchased" : "topup",
    paymentId: payment.id,
  });
}
```

## 10. Security Model

### 10.1 Entitlement Tenant Isolation

Every entitlement query MUST include `userId` or `agentId` scope:

```typescript
// CORRECT: scoped query
const grant = await prisma.entitlementGrant.findFirst({
  where: { agentId, userId, isActive: true, pack: { slug: packSlug } }
});

// WRONG: unscoped query (security vulnerability)
const grant = await prisma.entitlementGrant.findFirst({
  where: { pack: { slug: packSlug } }
});
```

### 10.2 Authorization Rules

| Action | Who Can Do It |
|---|---|
| View agent loadout | Agent owner |
| Attach add-on | Agent owner |
| Purchase top-up | Agent owner |
| Enable auto top-up | Agent owner |
| View usage ledger | Agent owner |
| Modify catalog/templates | Admin only |
| View all usage (admin) | Admin only |

### 10.3 Entitlement Verification on Every Metered Call

The skill resolution layer MUST verify entitlements before execution, never after. This prevents "use now, check later" billing disputes.

## 11. Error Handling

### 11.1 Fallback Chain Failures

```typescript
// lib/fallback/resolver.ts
async function resolveSkillImplementation(
  agentId: string,
  skillSlug: string
): Promise<ResolvedSkill> {
  const impls = await getImplementationsForSkill(skillSlug); // ordered: premium, cheap, free

  for (const impl of impls) {
    if (impl.tier === "premium") {
      const allowance = await checkAllowance(agentId, skillSlug);
      if (!allowance.hasRemaining) continue;
      return { impl, tier: "premium", allowance };
    }
    if (impl.isActive) {
      return { impl, tier: impl.tier, fallbackFrom: "premium" };
    }
  }

  // No implementation available at any tier
  return { blocked: true, reason: "no_active_implementation" };
}
```

### 11.2 Payment Failure During Top-up

If NOWPayments fails or times out:
- Do NOT grant entitlement
- Fall back to cheaper tier immediately
- Notify customer with retry link
- Log in `UsageDecisionLog` with `reason: "payment_failed"`

### 11.3 Redis Failure

If Redis is unavailable:
- Loadout cache: fall back to Prisma query (slower but correct)
- Allowance counter: fall back to atomic SQL UPDATE
- Budget tracking: Cortex already has Redis-down fallback (fail-safe to cheap)
- Log Redis failure for alerting

## 12. Event Architecture

### 12.1 Internal Events

Use a simple event bus (can be in-process for launch, extract to Redis Streams later):

| Event | Trigger | Consumers |
|---|---|---|
| `agent.provisioned` | Agent creation complete | Analytics, welcome notification |
| `loadout.changed` | Add-on attached/removed | Cache invalidation, notification |
| `entitlement.granted` | Payment confirmed | Cache invalidation, Redis counter setup |
| `allowance.exhausted` | Counter hits zero | Notification, auto-topup check |
| `allowance.threshold` | Counter hits 80% | Proactive notification |
| `skill.fallback` | Premium->cheaper resolution | UsageDecisionLog, notification |
| `usage.recorded` | Skill execution complete | Ledger batch insert, analytics |

### 12.2 Implementation

```typescript
// lib/events.ts (simple for launch)
type EventHandler = (payload: any) => Promise<void>;
const handlers: Record<string, EventHandler[]> = {};

export function on(event: string, handler: EventHandler) {
  (handlers[event] ??= []).push(handler);
}

export async function emit(event: string, payload: any) {
  for (const handler of handlers[event] ?? []) {
    try { await handler(payload); }
    catch (err) { logger.error(`Event handler failed: ${event}`, err); }
  }
}
```

## 13. API Routes

### 13.1 New Internal APIs

```
GET  /api/internal/use-cases                    List active templates
POST /api/internal/use-cases/:slug/provision    Provision agent from template
GET  /api/internal/catalog/items                List catalog items
POST /api/internal/catalog/items/:slug/attach   Attach add-on to agent
GET  /api/internal/agents/:id/loadout           Get resolved loadout
POST /api/internal/skills/resolve               Resolve skill -> implementation
POST /api/internal/usage/record                 Record usage (batch)
POST /api/internal/usage/decision               Log fallback decision
POST /api/internal/entitlements/topup           Initiate top-up purchase
POST /api/internal/entitlements/auto-topup      Toggle auto top-up
GET  /api/internal/entitlements/:agentId        Get agent entitlements + allowances
```

### 13.2 Existing API Changes

| Existing Route | Change |
|---|---|
| `POST /api/agents` | Accept `useCaseSlug` parameter, trigger provisioning flow |
| `GET /api/agents/[slug]` | Include loadout summary in response |
| `POST /api/webhooks/payment` | Handle addon/topup payment purposes |
| `GET /api/cortex/dashboard` | Include entitlement status per agent |

## 14. Seed Data and Registry

Registries are code-defined and synced to Prisma via upsert. No separate admin CMS needed.

```typescript
// lib/use-cases/registry.ts
export const USE_CASE_REGISTRY: UseCaseTemplateSeed[] = [
  {
    slug: "support-agent",
    name: "Support Agent",
    agentKind: "assistant",
    defaultExecutionMode: "hybrid",
    defaultBrainProvider: "cortex",
    items: [
      { slug: "conversation-core", isDefault: true },
      { slug: "knowledge-retrieval", isDefault: true },
      { slug: "ticket-triage", isDefault: true },
      { slug: "escalation", isDefault: true },
      { slug: "research-pro", isDefault: false },  // optional add-on
      { slug: "voice-mode", isDefault: false },
    ],
    entitlements: [
      { slug: "cortex-daily-budget", isIncluded: true },
      { slug: "knowledge-lookup-100", isIncluded: true },
    ],
  },
  {
    slug: "research-employee",
    name: "Research Employee",
    agentKind: "synthetic_employee",
    // ...
  },
  {
    slug: "painter-employee",
    name: "Painter Employee",
    agentKind: "synthetic_employee",
    // ...
  },
];

// Sync function (run on deploy or via admin endpoint)
export async function syncRegistry() {
  for (const template of USE_CASE_REGISTRY) {
    await prisma.useCaseTemplate.upsert({
      where: { slug: template.slug },
      create: { /* ... */ },
      update: { /* ... */ },
    });
  }
}
```

## 15. Migration Strategy (Existing Agents)

There are existing agents in production. They need to be migrated.

### 15.1 Approach: Backfill, Don't Break

1. All new schema fields are **optional** (`useCaseTemplateId?`, `loadoutVersion` has default)
2. Existing agents continue to work without a template (null template = legacy mode)
3. Run a migration script that:
   - Classifies each existing agent by `brainProvider` and deployment type
   - Assigns the closest `UseCaseTemplate`
   - Creates `AgentLoadoutItem` entries for capabilities the agent already uses
   - Creates `EntitlementGrant` with `grantType: "migration"` for existing premium usage
4. Legacy agents get generous migration allowances (e.g., 2x normal for first billing cycle)

### 15.2 Migration Script

```typescript
// scripts/migrate-agents-to-templates.ts
async function migrateExistingAgents() {
  const agents = await prisma.agent.findMany({
    where: { useCaseTemplateId: null, activationStatus: "active" }
  });

  for (const agent of agents) {
    const templateSlug = inferTemplate(agent); // based on brainProvider, features
    const template = await prisma.useCaseTemplate.findUnique({
      where: { slug: templateSlug },
      include: { items: true, entitlements: true }
    });

    if (!template) continue;

    await prisma.$transaction([
      prisma.agent.update({
        where: { id: agent.id },
        data: { useCaseTemplateId: template.id }
      }),
      ...template.items.filter(i => i.isDefault).map(item =>
        prisma.agentLoadoutItem.create({
          data: { agentId: agent.id, catalogItemId: item.catalogItemId }
        })
      ),
      // ... grant migration entitlements
    ]);
  }
}
```

## 16. Observability

### 16.1 Metrics to Track

| Metric | Type | Alert Threshold |
|---|---|---|
| Skill resolution latency (p50, p95, p99) | Histogram | p99 > 200ms |
| Entitlement check latency | Histogram | p99 > 50ms |
| Fallback rate (premium -> cheaper) | Counter | > 30% in 1h window |
| Allowance exhaustion events/hour | Counter | Spike > 3x baseline |
| Failed payment attempts | Counter | > 5 in 10 min |
| Redis miss rate (loadout cache) | Gauge | > 20% |
| Usage ledger write failures | Counter | Any > 0 |

### 16.2 Structured Logging

All new modules use the existing logger with structured fields:

```typescript
logger.info("skill.resolved", {
  agentId,
  skillSlug,
  resolvedTier: "cheap",
  fallbackFrom: "premium",
  reason: "allowance_exhausted",
  latencyMs: 12,
});
```

## 17. Testing Strategy

### 17.1 Critical Paths to Test

| Test | Type | Why |
|---|---|---|
| Provisioning creates correct loadout + entitlements | Integration | Billing correctness |
| Concurrent allowance decrement doesn't over-allocate | Load test | Race condition prevention |
| Fallback chain resolves correctly at each tier | Unit | Core business logic |
| Payment webhook is idempotent | Integration | Duplicate payment protection |
| Exhausted allowance triggers notification, not silent failure | Integration | Customer trust |
| Legacy agent without template still works | Integration | Migration safety |
| Redis failure falls back to Prisma correctly | Integration | Resilience |

### 17.2 Billing Invariants (Property Tests)

```typescript
// These must ALWAYS be true:
// 1. usedUnits <= totalUnits (no over-consumption)
// 2. sum(UsageLedgerEntry.units) == EntitlementAllowance.usedUnits (ledger consistency)
// 3. EntitlementGrant exists for every non-free UsageLedgerEntry (no unbilled usage)
// 4. Agent cannot invoke metered skill without active EntitlementAllowance (no free rides)
```

## 18. Code Structure

```
lib/
  use-cases/           # UseCaseTemplate registry and provisioning
    registry.ts        # Code-defined template definitions
    provisioner.ts     # Agent provisioning from template
  catalog/             # CatalogItem management
    items.ts           # CRUD and query
  skills/              # SkillDefinition and resolution
    registry.ts        # Code-defined skill definitions
    resolver.ts        # Skill -> implementation resolution
  implementations/     # SkillImplementation registry
    registry.ts        # Code-defined implementations
  entitlements/        # EntitlementPack, grant, allowance
    packs.ts           # Pack registry
    grants.ts          # Grant lifecycle (create, expire, reset)
    allowance.ts       # Allowance check and decrement (Redis + Prisma)
  loadouts/            # AgentLoadout resolution
    resolver.ts        # Loadout assembly
    cache.ts           # Redis-backed loadout cache
  fallback/            # Fallback policy engine
    resolver.ts        # Tier fallback chain
    policy.ts          # Per-skill fallback rules
  usage/               # Usage tracking
    ledger.ts          # Append-only ledger writes (batched)
    decisions.ts       # Fallback decision logging
  events.ts            # Internal event bus
  cortex/              # (existing) Cortex inference engine
  nowpayments.ts       # (existing) Payment integration
```

## 19. Rollout Plan

### Phase 1 (Week 1-2): Schema + Registries
- Run Prisma migration adding all new models
- Implement seed registries (use cases, catalog items, skills, implementations, entitlement packs)
- Implement `syncRegistry()` and run on deploy
- Existing agents unaffected (all new fields optional)

### Phase 2 (Week 3-4): Provisioning + Loadout
- Implement provisioning flow (template -> agent + loadout + entitlements)
- Wire `POST /api/agents` to accept `useCaseSlug`
- Implement loadout resolver + Redis cache
- Expose `GET /api/internal/agents/:id/loadout`
- Run migration script for existing agents

### Phase 3 (Week 5-6): Skill Resolution + Entitlements
- Implement skill resolver with fallback chain
- Implement allowance check (Redis + Prisma)
- Wire Cortex budget into entitlement system
- Implement usage ledger (batched writes)
- Add add-on attach flow + payment webhook extension

### Phase 4 (Week 7-8): Commerce + UX
- Implement top-up flow
- Add auto top-up toggle
- Add proactive notifications (80% threshold, exhaustion)
- Add fallback transparency notifications
- Expose usage/entitlement data in agent dashboard API
- Ship customer-facing UX surfaces

## 20. One-Line Architectural Principle

**MeetMatt sells bundles, equips agents with loadouts, meters entitlements via atomic Redis counters with Prisma fallback, executes everything through Matt-owned contracts, and records all decisions in an immutable ledger.**
