# MeetMatt Reliability + Cost Plan

Date: March 5, 2026
Owner: Product + Architecture + Engineering

## 1) Why this document exists
We need a single source of truth for the current problem and execution plan:
- Prevent missed work and non-atomic assistant operations.
- Fix billing model mismatch with real product reality.
- Control AI/model cost under heavy usage.
- Preserve high quality for users with predictable spend ceilings.

This doc consolidates all research and planning done in the latest architecture discussion.

## 2) Current reality (validated)

### Product reality
- Core model: assistance usage (user mentioned `$5/day` for assistant use).
- Use-case based operations: personal assistant, employees, fleet-like workloads.
- Need to support external APIs/generations and eventually local Qwen for savings.

### Code reality (key mismatches)
1. Payment creation still uses fixed monthly-style assumptions and fixed amount.
   - `price_amount: 150`
   - `tier: "matt"`
   - file: `app/api/payment/create/route.ts`

2. Payment webhook activates fixed subscription path (`monthly`) after confirm.
   - file: `app/api/webhooks/payment/route.ts`
   - helper: `lib/subscription.ts`

3. Agent creation defaults monthly-tier style values.
   - file: `app/api/agents/route.ts`

4. Deploy queue exists but reliability depends on ops configuration + processing loop.
   - files: `lib/deploy-jobs.ts`, `app/api/internal/deploy-jobs/process/route.ts`, `app/api/cron/process-deploy-jobs/route.ts`

## 3) Top bottlenecks (prioritized)

## P0: Atomicity / execution reliability
- Risk: paid action may still fail operationally if job processing/recovery is weak.
- Impact: assistant "gets fired" failure mode (work not done).

## P0: Billing model mismatch
- Risk: backend logic still wired to old monthly-style flow.
- Impact: business model drift, wrong entitlements, confusing revenue control.

## P1: Payment integrity controls
- Risk: activation logic depends on status transitions, but should be anchored to canonical billing intent + strict value checks.
- Impact: incorrect activation or hard-to-debug payment disputes.

## P1: Queue/worker operations maturity
- Risk: job processing cadence and recovery paths can be brittle if cron/worker setup is not guaranteed.
- Impact: delayed or missed deployments/actions.

## P2: AI cost runaway (context + escalation)
- Risk: no strict complexity router + cap system = overuse of paid models and large context cost spikes.
- Impact: margin collapse under heavy usage.

## 4) Architecture goals (what success means)
1. Business-level exactly-once outcomes (safe retries, idempotent effects).
2. No missed work: every critical action has a durable state and retry path.
3. Billing and entitlement logic reflect real product packaging (daily/use-case based).
4. AI spend has hard ceilings: per-user + global.
5. Quality is optimized by task-success rate, not stylistic output.

## 5) Reliability-first execution architecture

### State model
Use explicit durable states for jobs:
- `pending -> processing -> completed | failed | dead_letter`

### Atomic creation
- Create business object + job in one transaction (or transactional outbox).
- Never fire-and-forget side effects.

### Worker model
- Worker continuously claims due jobs.
- Cron is wakeup/safety, not sole executor.

### Idempotency
- Every external side effect includes an `idempotency_key`.
- Duplicate events must be safe and no-op at business level.

### Leases + heartbeats
- Claimed jobs have lease expiry.
- Stuck `processing` jobs auto-return to `pending`/retry.

### Retry + DLQ
- Retry transient failures with backoff.
- Route non-recoverable to dead-letter with reason codes.

### Reconciliation sweeper
- Periodic scanner for:
  - paid but not activated,
  - processing too long,
  - inconsistent status tuples.
- Auto-repair where possible.

## 6) Billing architecture to align with product reality

Introduce canonical `BillingIntent` (source of truth):
- `intent_id`, `user_id`, `use_case`, `package_type`, `expected_amount`, `currency`, `status`, `expires_at`.

Payment webhook behavior:
1. Verify signature.
2. Resolve `BillingIntent`.
3. Validate amount/currency/use_case/package matches expected.
4. Mark payment state.
5. Enqueue activation job only (no deep synchronous business flow).

Entitlement behavior:
- Entitlements derived from package (e.g., daily assistance, employees, fleet allocation), not hardcoded monthly defaults.

## 7) Smart routing strategy (quality per dollar)

### Principle
Router should reduce cost, not add cost.

### 3-tier policy
- Tier A: cheap default model.
- Tier B: stronger mid-cost model for medium/hard/tool-heavy requests.
- Tier C: premium model only on explicit failure-risk triggers.

### Mandatory cost guardrails
- Per-user hard cap.
- Global hard cap.
- Max premium escalation share cap (e.g., 5-10%).
- Context compression before escalation.
- Max tokens per tier.

### Degradation policy
If premium unavailable/cap reached:
- continue on lower tier,
- never silently abandon request.

## 8) API-first measurement phase (before local Qwen)
Purpose: measure true heavy-usage cost envelope with strict controls.

Run in phases:
1. Enable router + guardrails with API models only.
2. Collect 2-4 weeks of usage ledger.
3. Measure:
   - task success rate,
   - p95 latency,
   - premium escalation %,
   - cost/user/day and total cost/day.
4. Then introduce local Qwen tiers to replace significant Tier A/B traffic.

## 9) Cost framework (for scenario simulation)

For each provider/model:
`cost = (input_tokens/1e6 * input_price) + (output_tokens/1e6 * output_price)`

Daily:
`daily_cost = sum(cost_per_request)`

Monthly:
`monthly_cost ~= daily_cost * 30 + infra_fixed_cost`

Critical multiplier:
- Long context replay is usually the largest hidden cost driver.

## 10) Product work plan (proposed)

### Phase 1 (Weeks 1-2): Atomic reliability foundation
- Durable job model, lease + heartbeat, retries, DLQ.
- Reconciliation sweeper + repair actions.

### Phase 2 (Weeks 2-3): Billing correctness
- Introduce `BillingIntent` and use-case/package entitlement mapping.
- Payment webhook -> enqueue-only activation pipeline.

### Phase 3 (Weeks 3-5): Cost-controlled routing
- 3-tier router, caps, context compression, route logging.
- Shadow mode first, then controlled activation.

### Phase 4 (Weeks 5-6): Observability and operations
- Dashboards: queue age, failure classes, paid->activated SLA, model spend.
- Alerts and incident playbooks.

### Phase 5 (Weeks 6-8): Controlled rollout
- 10% -> 50% -> 100% rollout.
- Weekly threshold tuning based on task-success and spend.

## 11) Metrics and SLAs
- Activation success rate >= 99.5%.
- Zero orphan paid intents older than SLA threshold.
- Stuck processing job rate < 0.5%.
- Premium escalation share under configured cap.
- Task-success trend improving while spend/user bounded.

## 12) Open decisions for product architect workshop
1. Final package model definitions:
   - assistant daily,
   - employees,
   - fleet.
2. Entitlement unit and reset windows.
3. Cap values:
   - per-user daily/monthly,
   - global daily/monthly,
   - premium escalation ceiling.
4. Initial default model combinations for Tier A/B/C.
5. SLA targets by use case (assistant vs employees vs fleet).

## 13) External references used
- OpenAI pricing: https://openai.com/api/pricing/
- Anthropic pricing: https://docs.anthropic.com/en/docs/about-claude/pricing
- Gemini API pricing: https://ai.google.dev/pricing
- xAI model docs/pricing: https://docs.x.ai/docs/models
- NOWPayments IPN reference: https://nowpayments.io/help/what-is/what-is-ipn

---

This document is intended for product-architecture alignment and implementation scoping.
