# MeetMatt Final Platform Direction

**Date:** March 6, 2026  
**Status:** Final alignment draft  
**Audience:** CEO / CTO / CPO / implementation leads

## 1. Executive summary

MeetMatt should be built and sold as a platform where customers **hire agents for jobs**.

The product should support four layers:
- **Assistants**: reactive, conversational, user-facing
- **Synthetic Employees**: proactive, autonomous, persistent workers
- **Premium Specialists**: higher-cost expert workers such as coders, researchers, strategists, designers
- **Matt Ops**: internal support, account management, supervision, escalation, and backoffice support

The commercial abstraction should be:
- **Use case = product bundle**

The internal system abstraction should be:
- **UseCaseTemplate**
- **CatalogItem**
- **SkillDefinition**
- **SkillImplementation**
- **EntitlementPack**
- **AgentLoadout**
- **UsageLedger**
- **WorkerTier**

The public product should stay simple for now.

Publicly, customers should still understand MeetMatt as:
- hire an agent for a job
- see what comes included
- add premium capabilities when needed

Internally, the platform should evolve into a layered capability commerce and orchestration system.

## 2. Final product thesis

MeetMatt should not be:
- a generic chatbot builder
- a raw tool marketplace
- a vague “credits” product

MeetMatt should be:
- a **use-case agent platform**
- with **predefined bundles**
- **visible included capabilities**
- **paid premium allowances where relevant**
- **optional upgrades**
- **autonomous work where appropriate**

The key customer promise is:

> You hire the right Matt agent for the job, it already comes equipped for that role, and you can extend it when the work gets more advanced.

## 3. Product lineup

### 3.1 Assistants

Reactive, conversational, user-facing.

Examples:
- Support Agent
- Sales Assistant
- Concierge Assistant

Characteristics:
- chat-first
- lower setup friction
- can execute on request
- may optionally trigger background work

### 3.2 Synthetic Employees

Persistent workers that can operate proactively.

Examples:
- Research Employee
- Lead Hunter
- Inventory Watcher
- Customer Support Employee

Characteristics:
- schedule-based or event-based work
- can continue working without a prompt
- stronger memory and workflow behavior
- may use Telegram Bot API or Telethon depending on role

### 3.3 Premium Specialists

Higher-cost, expert-class workers using stronger models, more expensive tools, or more powerful workflows.

Examples:
- Coder
- Research Analyst
- Strategy Lead
- Designer / Painter
- Backoffice Operator

These should be modeled as a **distinct product layer**, not as ordinary add-on skills.

Why:
- they imply different cost structure
- they imply different quality expectations
- they need different routing and budget ceilings
- they need different approval and permission policies

### 3.4 Matt Ops

Internal agents that support the rest of the system.

Examples:
- Matt Support
- Matt Account Manager
- Billing Recovery
- Ops Supervisor
- Escalation / QA / Triage

These should exist to support customer-facing assistants and synthetic employees, not replace them as the main product.

## 4. Final customer-facing product model

The customer should experience the system as:

1. choose a **use case**
2. get an **agent** with a predefined starter bundle
3. see the included **items**
4. see any included **premium usage**
5. add more **items** or hire more advanced agents later

This means the customer-facing vocabulary should be:
- Agent
- Use Case
- Included Items
- Add-ons
- Premium Usage
- Top-up
- Upgrade
- Specialist

Avoid exposing:
- entitlement
- implementation
- runtime engine
- skill definition
- fallback policy

## 5. Public product guardrail

This is important:

The backend and internal architecture should evolve now, but the **public landing/pricing story does not need to change immediately**.

That means:
- do not rewrite the public offer around internal architecture terms
- do not force capability commerce complexity into the public homepage yet
- keep the external story simple until the new product packaging is intentionally launched

Internal capability commerce can be built first.

Public messaging can lag behind implementation until:
- core bundles are working
- premium items are real
- usage and fallback logic are tested
- the team chooses a deliberate GTM update

## 6. Canonical internal concept model

### 6.1 `UseCaseTemplate`

The top-level sellable blueprint.

Examples:
- support-agent
- research-employee
- painter-employee
- coder-specialist

Defines:
- role
- defaults
- included items
- included entitlements
- optional add-ons
- policy defaults
- schedule defaults
- transport defaults

### 6.2 `CatalogItem`

The customer-facing item or capability package.

Examples:
- Painter
- Research Pro
- Competitor Watch
- CRM Sync
- Planck Backoffice Access

This is the merchandising layer.

### 6.3 `SkillDefinition`

The internal normalized capability.

Examples:
- image_generation
- premium_search
- competitor_monitoring
- planck_record_write
- outbound_followup

This is the orchestration/runtime layer.

### 6.4 `SkillImplementation`

The concrete backend/provider/code path.

Examples:
- free image generator
- premium image generator
- OpenClaw-derived interactive worker
- OpenFang-derived autonomous worker
- Planck connector implementation

This is where forked/adopted code lives.

### 6.5 `EntitlementPack`

The thing that grants access and/or usage.

Examples:
- 50 premium generations
- 250 premium research queries
- CRM write access
- premium strategy pack

### 6.6 `AgentLoadout`

What a specific agent actually has equipped.

This is the bridge between:
- what was sold
- what is enabled
- what the runtime can use

### 6.7 `WorkerTier`

This is the missing specialist layer and should be explicit.

Examples:
- `standard`
- `premium`
- `specialist_coder`
- `specialist_research`
- `specialist_strategy`
- `specialist_design`

This controls:
- allowed model families
- budget ceilings
- quality expectations
- default skills/items
- approval requirements
- fallback behavior

## 7. Final commerce model

### 7.1 Base rule

Customers buy **agents by use case**.

Each use case provisions:
- a role/profile
- a starter item bundle
- default policies
- default runtime configuration
- included entitlements if relevant

### 7.2 Add-ons

Customers can attach additional items after creation.

Examples:
- add Painter to a Support Agent
- add Research Pro to a Sales Assistant
- add monitoring to a Research Employee

### 7.3 Premium specialists

Some advanced capabilities should be sold as:
- a specialist agent
- or a specialist worker available to an existing team/agent cluster

Not every premium capability should be reduced to an add-on.

This gives a clean product ladder:
- base use-case agents
- premium items
- premium specialists

### 7.4 Usage and overage

Default sequence:
1. use included premium allowance
2. use purchased top-up
3. if enabled, auto-charge
4. otherwise fallback to cheaper implementation
5. otherwise fallback to free implementation
6. otherwise block and prompt

Fallback must be disclosed explicitly when quality changes.

### 7.5 Scope

Default scope should be:
- **per agent**

Future advanced scope:
- workspace-wide packs
- team packs
- fleet-level packs

But these should come later.

## 8. Assistant vs synthetic employee split

This must be explicit in the final product architecture.

### Assistants

Best for:
- chat-first work
- lower setup complexity
- reactive support and guidance

### Synthetic employees

Best for:
- recurring work
- ongoing research
- monitoring
- follow-up loops
- delegated execution

### Combined model

In many cases the right architecture is:
- assistant as front door
- synthetic employee as autonomous backbone

This is the strongest long-term differentiation.

## 9. Final system architecture

## 9.1 Matt-owned layers

Matt must own:
- tenancy
- agent registry
- use-case templates
- catalog
- worker tiers
- entitlements
- loadouts
- approval policies
- routing
- schedules
- transport bindings
- usage ledger
- observability
- billing

## 9.2 Borrowed/forked code policy

If external code works, MeetMatt can:
- copy it
- fork it
- vendor it
- adapt it

But the rule is:

**Matt owns the contracts. Borrowed code implements Matt contracts.**

This applies to:
- OpenClaw-derived components
- OpenFang-derived components
- any other useful runtime code

## 9.3 Runtime layers

### Interactive runtime

Best for:
- chat loops
- user-driven actions
- support interactions

### Autonomous runtime

Best for:
- scheduled jobs
- monitoring
- research workers
- recurring specialist tasks

### Native/direct executor

Best for:
- lightweight deterministic tasks
- routing
- API wrappers
- approval plumbing

## 9.4 Transport layers

Supported independently from execution:
- Telegram Bot API
- Telethon
- web
- later: voice/email/etc.

Telethon remains an optional extra layer, not the default for everything.

## 10. Recommended code architecture

Recommended module groups:

- `lib/use-cases/`
- `lib/catalog/`
- `lib/skills/`
- `lib/implementations/`
- `lib/entitlements/`
- `lib/loadouts/`
- `lib/runtime/`
- `lib/fallback/`
- `lib/billing/`
- `lib/worker-tiers/`

Recommended services:
- `telethon-runner/`
- `autonomy-runner/`
- `interactive-worker/`
- later: `sandbox-executor/`

## 11. Data model summary

Core models to support the direction:

- `UseCaseTemplate`
- `UseCaseTemplateItem`
- `UseCaseTemplateEntitlement`
- `CatalogItem`
- `CatalogItemSkill`
- `SkillDefinition`
- `SkillImplementation`
- `FallbackPolicy`
- `EntitlementPack`
- `EntitlementPackSkill`
- `EntitlementPackGrant`
- `EntitlementAllowance`
- `AgentLoadoutItem`
- `AgentSkillBinding`
- `UsageLedgerEntry`
- `UsageDecisionLog`
- `WorkerTier` or equivalent tier/profile metadata

Existing agents should also carry:
- `useCaseTemplateId`
- `loadoutVersion`
- `autoTopupDefault`
- `workerTier` or equivalent

## 12. Recommended rollout

### Phase 1: Core backend foundation

- schema and contracts
- code-defined registries
- provisioning and loadout resolution
- usage ledger
- entitlements and allowance logic

### Phase 2: Base use-case agents

Launch internally supported base bundles for:
- Support Agent
- Research Employee
- Synthetic Employee Core

### Phase 3: Premium items

Launch 1-2 add-ons with visible allowance:
- Painter
- Research Pro

### Phase 4: Specialist layer

Launch premium specialist workers:
- Coder
- Research Analyst
- Strategy Lead

### Phase 5: Customer surfaces

Expose:
- included items
- premium usage
- top-ups
- upgrades
- fallback transparency

### Phase 6: Public GTM update

Only after the system is stable:
- update landing story
- update pricing story
- update public packaging

## 13. Success criteria

This direction is successful when:

- MeetMatt can sell agents by use case cleanly
- each agent can receive a predefined starter bundle
- premium capabilities can be added without redesigning the product
- specialist workers are modeled explicitly
- reactive assistants and autonomous synthetic employees can coexist
- premium usage is visible and controllable
- fallback behavior is transparent
- public messaging can remain simple while internal architecture becomes much more powerful

## 14. Final principle

**MeetMatt sells jobs-to-be-done as agent bundles, equips agents with items, meters premium usage separately, routes work across reactive and autonomous runtimes, and treats external code as absorbable implementation detail under Matt-owned contracts.**
