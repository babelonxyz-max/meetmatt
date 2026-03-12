# MeetMatt Product Strategy

Date: March 6, 2026
Owner: Product + Founder + Engineering

Related:
- `docs/MEETMATT_RELIABILITY_COST_PLAN_2026-03-05.md`
- `docs/plans/2026-03-06-telethon-matt-fleet-foundation.md`

## 1) Product thesis

MeetMatt should not be positioned as a generic bot builder.

It should be positioned as:

`MeetMatt = a Telegram-native AI operator platform with a named Matt relationship layer`

This matters because the market is getting crowded with generic "build an agent" products. The differentiator is not raw model access or bot count. The differentiator is accountability, continuity, and operational coverage.

Every paying account should feel like it has:
- its own Matt relationship
- reliable support inside Telegram
- optional customer-facing deployed agents
- a hidden internal fleet doing the backstage work

## 2) Product model

MeetMatt should be run as three product layers:

### Layer A: Customer agents

These are the bots, assistants, or operators the customer deploys for their own end users, communities, or workflows.

Examples:
- support bot for a Telegram group
- lead qualification bot
- onboarding bot
- billing reminder bot
- internal employee assistant

### Layer B: Matt relationship

This is the product wedge.

Each account gets a persistent "Matt" relationship that acts as:
- account manager
- support front door
- setup guide
- follow-up layer
- escalation surface

This should feel like a single ongoing thread, not a series of disconnected tickets.

### Layer C: Internal fleet

This is not the headline product. It is the backstage leverage layer.

The internal fleet handles:
- support triage
- ops escalation
- billing recovery
- onboarding follow-up
- QA and replay
- incident handling
- renewal risk detection

Customers should mostly interact with Matt, not with the fleet directly.

## 3) Core promise

The clearest promise is:

`You get a named Matt on Telegram who helps you deploy, operate, and improve your AI operators.`

That promise is stronger than:
- "build a bot in 15 minutes"
- "AI support automation"
- "multi-agent platform"

Those are features. The promise is ownership and follow-through.

## 4) Why now

The platform direction is supported by current ecosystem changes:

- Telegram Bot API 9.3 added `sendMessageDraft` on December 31, 2025, which makes partial/streaming replies possible in Telegram.
- Telegram's connected business bot model allows bots to process and answer messages on behalf of business users.
- Telethon stable is currently `1.42.0`, which is a reasonable production base for MTProto-first Telegram operations.
- OpenAI's March 11, 2025 agent tooling launch and October 6, 2025 AgentKit launch both push the market toward connectors, evals, orchestration, and embedded agent experiences.
- Claude memory launched on September 11, 2025 with project-scoped memory, editable memory, and incognito chat, which makes memory controls an expected UX pattern.
- Gemini's Google Search grounding and context caching support a viable research/retrieval lane for higher-value operator tasks.

Inference:
- Telegram is no longer just a messaging endpoint.
- The product should be built as an operator system with memory, streaming, connectors, and measurable performance.

## 5) Ideal customers

### Primary ICP

The first accounts should be Telegram-native operators with real inbound volume and a willingness to pay for responsiveness:

- founder-led services businesses
- boutique agencies
- crypto-native teams
- paid communities with support and onboarding load
- concierge or high-touch operators who live in Telegram

### Secondary ICP

- internal teams that want Telegram-based ops assistants
- white-label agencies
- creators or educators with paid Telegram communities

### Anti-ICP

Avoid broad SMB positioning early.

Do not start by selling to:
- businesses that do not already use Telegram as a core channel
- price-sensitive buyers who only want a cheap chatbot
- procurement-heavy enterprise accounts before the support/operator loop is proven

## 6) Jobs to be done

MeetMatt should win the following jobs first:

1. "Handle inbound support and follow-up for me in Telegram."
2. "Give me a named operator I can message when things break."
3. "Deploy and manage customer-facing assistants without me becoming an AI ops engineer."
4. "Keep context across conversations so I do not have to repeat myself."
5. "Escalate correctly when billing, refunds, or account issues need approval."

Later jobs:

1. "Run my business inbox."
2. "Help my team operate faster from Telegram."
3. "Act as an account-management and renewal layer."
4. "Power a white-label operator product for my clients."

## 7) Product strategy

### The wedge

The first wedge is not "agent creation."

The first wedge is:

`Matt relationship + Telegram support + follow-through`

That gives the buyer an immediately understandable reason to pay.

### The expansion path

After the relationship wedge is working:

1. add customer-facing deployed agents
2. add business account automation
3. add connectors and workflow actions
4. add internal fleet tasking
5. add white-label and partner distribution

### Product principle

Every feature should strengthen one of these loops:

- faster resolution
- better continuity
- lower customer effort
- higher operator leverage
- measurable business outcomes

If a feature does not improve one of those loops, it is likely noise.

## 8) Feature roadmap

### P0: Relationship MVP

Goal: make MeetMatt feel like a real Telegram-native operator product.

Must-have features:
- persistent Matt thread per account
- Matt Support identity
- Matt Account Manager identity
- shared customer timeline
- support ticket creation behind the scenes
- Telethon-based message transport
- typing states and partial/streaming reply UX
- basic memory controls:
  - remember this
  - forget this
  - temporary chat

Success criteria:
- customers use Telegram as the main control plane
- first response time under 1 minute for routine requests
- clear escalation path for complex issues

### P1: Operator productivity

Goal: turn Matt into a useful business operator, not just support.

Features:
- business account automation
- CRM/helpdesk connectors
- billing reminders and renewal follow-up
- onboarding nudges
- admin dashboard for conversations, tickets, and relationship health
- evals and trace dashboards for support quality, cost, and escalation rate

Success criteria:
- measurable support deflection
- measurable reduction in customer waiting time
- visible improvement in renewal / expansion conversations

### P2: Internal fleet leverage

Goal: increase gross margin and service quality through backstage automation.

Features:
- internal fleet roles:
  - support-triage
  - billing-recovery
  - ops-escalation
  - QA/replay
- approval flows for refunds, account changes, and risky outbound actions
- task queues with SLA and replay
- multi-agent orchestration for backstage work

Success criteria:
- lower cost per resolved thread
- lower human handling load
- better reliability and fewer dropped issues

### P3: Distribution expansion

Goal: increase ACV and distribution surface.

Features:
- white-label operator mode
- partner dashboard
- voice and phone layer for high-ticket support/sales
- research mode with search and document grounding
- internal employee operator packages

Success criteria:
- larger contracts
- partner-led sales
- higher expansion revenue per customer

## 9) Packaging and pricing recommendation

The current public pricing in the repo still reflects a simpler "one AI agent" offer. That is behind the direction of the product.

The new packaging should be relationship-led, not bot-count-led.

### Recommended packages

#### 1. Starter

Target: solo operators and small teams

Recommended price:
- `$149-$249/month`

Includes:
- 1 Matt relationship thread
- pooled Matt Support
- 1 deployed agent
- Telegram control plane
- basic memory
- basic reporting

Notes:
- good for design partners and self-serve entry
- should not promise true white-glove service

#### 2. Growth

Target: teams with real support or onboarding load

Recommended price:
- `$499-$999/month`

Includes:
- persistent Matt relationship
- proactive Matt Account Manager behavior
- faster support SLA
- 2-3 deployed agents
- basic connectors
- onboarding and follow-up automations

Notes:
- likely the core package
- should be optimized for retention and expansion

#### 3. Operator

Target: serious operators running Telegram as a frontline business channel

Recommended price:
- `$1,500-$3,000/month`

Includes:
- high-priority Matt support
- dedicated account-management workflows
- multiple deployed agents
- business account automation
- advanced connector set
- custom workflows
- approvals and escalation policies

Notes:
- likely where the best margins and strongest case studies will come from

#### 4. Fleet / White-label

Target: agencies, partners, high-touch operators, and internal team deployments

Recommended price:
- `$5,000+/month` or setup fee + monthly retainer

Includes:
- multi-account operations
- white-label or partner support
- fleet tooling
- custom integrations
- premium SLA
- implementation help

### Pricing principles

- Price on business value, not token volume.
- The named Matt relationship should be part of every plan, but premium responsiveness and proactive account-management behavior should tier upward.
- Avoid selling "unlimited agents" as the headline.
- Use setup fees where implementation work is real.
- Preserve room for services revenue on higher tiers.

## 10) Go-to-market plan

### Stage 1: Design partner motion

Target:
- 5 to 10 customers

Offer:
- Telegram-native support/operator setup
- founder-led onboarding
- high-touch feedback loop

Goal:
- prove that the Matt relationship layer changes retention and perceived value

### Stage 2: Wedge use cases

Lead with one of these promises:

1. "Matt handles your Telegram support inbox."
2. "Matt helps you onboard and follow up with customers."
3. "Matt gives you a persistent operator for support, billing, and escalation."

Do not lead with:
- generic multi-agent architecture
- model benchmarks
- internal fleet complexity

### Stage 3: Expansion inside accounts

Expand accounts by adding:
- more deployed agents
- more channels/workflows
- business automation
- account-management automation
- internal team use cases

### Acquisition channels

- founder/operator networks
- Telegram-native communities
- boutique agencies
- existing support-heavy businesses
- white-label partners after the core offer is proven

## 11) Messaging

### Recommended positioning line

`MeetMatt gives every customer a named AI operator on Telegram.`

### Supporting lines

- `Deploy customer-facing agents, but keep one persistent Matt relationship for support and operations.`
- `Run support, follow-up, and business workflows from Telegram with memory, escalation, and accountability.`
- `Use Matt as the front door. Let the internal fleet do the backstage work.`

### What not to say

- "Chatbot builder"
- "No-code bot platform"
- "Unlimited AI agents for everyone"
- "General AI automation for all businesses"

Those phrases flatten the product into a commodity category.

## 12) Metrics

### North-star metrics

- resolved high-value threads per account
- retained revenue per account

### Customer outcome metrics

- first response time
- resolution rate
- escalation rate
- repeat-contact rate
- onboarding completion rate
- renewal / expansion rate

### Product quality metrics

- support deflection
- task success rate
- cost per resolved thread
- model escalation share
- time to handoff
- ticket aging

### Business metrics

- ACV by package
- gross margin by account
- payback period
- logo retention
- expansion revenue

## 13) What not to build first

Do not prioritize these ahead of the relationship wedge:

- broad omnichannel support
- advanced white-label tooling
- complex consumer-facing multi-agent choreography
- deeply customizable bot builders
- low-price unlimited plans

These can all matter later, but they should not come before support/account-management product fit.

## 14) 30/60/90 day execution plan

### Next 30 days

- finalize positioning and package names
- build the Matt thread MVP in Telegram
- stand up Matt Support and Matt Account Manager flows
- validate one support-heavy use case with design partners
- instrument basic metrics:
  - response time
  - resolution rate
  - escalation rate

### Day 31-60

- add memory controls
- add streaming/partial reply UX
- add basic support dashboard and replay
- launch first connector or internal tool integration
- standardize approval gates for billing/account actions

### Day 61-90

- add business account automation
- add relationship health views
- add proactive follow-up and renewal flows
- launch Growth package
- begin partner / white-label conversations only after case studies are real

## 15) Immediate decisions required

1. Whether every paid plan includes a Matt relationship, or whether Starter remains a lower-touch self-serve offer.
2. The first 2 customer segments to target.
3. Whether public pricing stays simple for now or moves to a relationship-led package page.
4. Whether the first GTM motion is support-first, onboarding-first, or account-management-first.
5. The threshold where a customer gets higher-touch SLA and proactive account-management behavior.

## 16) References

Validated on March 6, 2026 from official sources:

- Telegram Bot API changelog: https://core.telegram.org/bots/api-changelog
- Telegram connected business bots: https://core.telegram.org/api/bots/connected-business-bots
- Telegram bots via MTProto: https://core.telegram.org/api/bots
- Telethon stable docs (`1.42.0`): https://docs.telethon.dev/en/stable/
- Telethon session docs: https://docs.telethon.dev/en/stable/concepts/sessions.html
- Telethon Bot API vs MTProto: https://docs.telethon.dev/en/v2/concepts/botapi-vs-mtproto.html
- OpenAI new tools for building agents (March 11, 2025): https://openai.com/index/new-tools-for-building-agents/
- OpenAI AgentKit (October 6, 2025): https://openai.com/index/introducing-agentkit/
- Claude memory (September 11, 2025): https://www.claude.com/blog/memory
- Gemini Google Search grounding: https://ai.google.dev/gemini-api/docs/google-search
- Gemini context caching: https://ai.google.dev/gemini-api/docs/caching

## 17) Bottom line

MeetMatt should be built and sold as a Telegram-native operator with a named Matt relationship layer.

The customer-facing agents matter.
The internal fleet matters.
But the product advantage is the persistent Matt relationship that sits between them.
