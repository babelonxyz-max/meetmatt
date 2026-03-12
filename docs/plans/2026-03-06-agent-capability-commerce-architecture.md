# MeetMatt Agent Capability Commerce Architecture

**Date:** March 6, 2026  
**Status:** Proposed implementation architecture  
**Audience:** CTO / product architecture / implementation

## 1. Executive summary

MeetMatt should sell **agents by use case**, not raw tools.

Each use case is a **bundle** that provisions:
- a role/profile
- a default capability loadout
- included paid allowances where relevant
- default policies, memory behavior, schedules, and channels

Under the hood, the architecture must separate:
- `CatalogItem` = what the customer sees and buys
- `SkillDefinition` = what the runtime understands
- `SkillImplementation` = the concrete backend/provider/code path
- `EntitlementPack` = what was paid for
- `AgentLoadout` = what a specific agent actually has equipped

This lets MeetMatt support:
- assistants
- synthetic employees
- internal Matt support/ops agents
- premium add-ons
- top-ups
- cheap/free fallback behavior

without turning one concept like “skill” into a billing object, runtime object, and UI object all at once.

## 2. Core product model

### 2.1 Use case

The primary sellable object.

Examples:
- Support Agent
- Sales Assistant
- Research Employee
- Painter Employee
- Account Manager

### 2.2 Bundle

The composition of a use case.

A bundle contains:
- included items
- optional add-ons
- included entitlements
- default runtime/profile settings
- default policies

### 2.3 Agent

One instantiated worker created from a use-case bundle.

### 2.4 Add-on

An extra purchasable capability or pack attached after the base agent is provisioned.

Examples:
- Painter
- Research Pro
- Planck write access
- premium generations
- monitoring pack

## 3. Canonical object model

### 3.1 `UseCaseTemplate`

The top-level product bundle definition.

Responsibilities:
- defines what is included by default
- defines optional add-ons
- defines default execution/policy/profile assumptions

Key fields:
- `slug`
- `name`
- `agentKind`
- `defaultExecutionMode`
- `defaultTransportPolicy`
- `defaultBrainPolicy`
- `templateSpec`
- `promptSpec`
- `guardrailSpec`
- `scheduleSpec`
- `memorySpec`
- `approvalSpec`

### 3.2 `CatalogItem`

The customer-facing item.

Responsibilities:
- powers merchandising
- appears in bundle listings
- can be attached as an add-on

Examples:
- Painter
- Researcher
- Lead Finder
- CRM Sync
- Planck Backoffice

Important note:
Not every `CatalogItem` is a single runtime skill. Some items map to multiple capabilities.

### 3.3 `SkillDefinition`

The internal canonical capability.

Responsibilities:
- used by orchestration/runtime
- normalized regardless of origin

Examples:
- `image_generation`
- `lead_enrichment`
- `competitor_monitoring`
- `planck_record_write`
- `telegram_followup`

### 3.4 `SkillImplementation`

The executable implementation behind a skill.

Responsibilities:
- points to the actual provider/backend/code path
- may be free, cheap, or premium
- may come from Matt-native code or forked external code

Examples:
- `nano_banana_free`
- `premium_image_backend_v1`
- `planck_customer_lookup_v1`
- `openfang_research_worker_fork`
- `openclaw_interactive_skill_fork`

### 3.5 `EntitlementPack`

The paid access or allowance package.

Responsibilities:
- grants access
- grants included usage
- can reset on billing cycle or purchase period
- can be sold as included, subscription, or top-up

Examples:
- Painter Starter: 50 premium generations
- Research Pro: 250 premium searches
- Planck Write Access

### 3.6 `AgentLoadout`

The resolved set of items and skills attached to a specific agent.

Responsibilities:
- tells runtime what this agent can do
- tells billing what is actually equipped
- allows future overrides per agent

### 3.7 `UsageLedger`

Immutable record of metered capability usage.

Responsibilities:
- billing correctness
- debugability
- overage handling
- fallback transparency

## 4. Runtime and execution architecture

MeetMatt should own the control plane and runtime contract.

### 4.1 Matt-owned layers

Must remain first-party:
- tenancy
- agent registry
- use-case bundles
- catalog items
- entitlements
- loadouts
- permissions
- approval gates
- schedules
- transport routing
- usage ledger
- observability

### 4.2 External code policy

If external code works, MeetMatt can:
- copy it
- fork it
- vendor it
- improve it

But external code must be normalized under Matt-owned contracts.

Rule:
- `Matt owns contracts`
- `borrowed code implements Matt contracts`

### 4.3 Execution modes

MeetMatt should support:
- `reactive_only`
- `autonomous_only`
- `hybrid`

### 4.4 Execution engines

MeetMatt can route work to multiple engines:
- interactive engine
- autonomous engine
- native/direct executor

Potential external inspirations:
- OpenClaw-style interactive loops
- OpenFang-style autonomous background workers

But these remain implementation sources, not the product core.

## 5. Billing and commerce architecture

### 5.1 Selling model

The commercial abstraction is:
- `use case = bundle`

The runtime abstraction is:
- `skills + implementations + entitlements`

### 5.2 Default rules

- agents are sold by use case
- each use case ships with included items
- some included items have paid allowances attached
- extra items can be added later
- default scope is `per agent`
- shared/workspace packs are a second-layer extension

### 5.3 Overage behavior

Default sequence:
1. consume included allowance
2. consume active top-up pack
3. if enabled, use auto-charge
4. otherwise fall back to cheaper implementation
5. otherwise fall back to free implementation
6. otherwise block and prompt for purchase

### 5.4 Disclosure rule

If runtime falls back from premium to cheaper/free mode, the customer should be informed explicitly.

### 5.5 Reset model

MeetMatt should support mixed reset behavior:
- billing-cycle reset
- per-purchase-period reset
- one-off consumables with no reset

## 6. Data model summary

### New or expanded entities

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

### Existing models to extend

`Agent`
- `useCaseTemplateId`
- `loadoutVersion`
- `autoTopupDefault`

`Payment`
- `paymentPurpose`
- `targetType`
- `targetId`
- `lineItems`

## 7. API architecture

### Internal APIs to add

- `GET /api/internal/use-cases`
- `POST /api/internal/use-cases/:slug/provision`
- `GET /api/internal/catalog/items`
- `POST /api/internal/catalog/items/:slug/attach`
- `GET /api/internal/agents/:id/loadout`
- `POST /api/internal/skills/resolve`
- `POST /api/internal/usage/record`
- `POST /api/internal/usage/decision`
- `POST /api/internal/entitlements/topup`
- `POST /api/internal/entitlements/auto-topup`
- `GET /api/internal/entitlements/:scope/:ownerId`

### Public API impact

No required public UX rewrite in the first implementation phase.

The public flow can stay simple while the backend becomes bundle-aware.

## 8. Suggested built-in starter bundles

### `customer-assistant-core`
- conversation core
- knowledge retrieval
- Telegram bot delivery
- light research allowance

### `customer-fleet-core`
- conversation core
- background workflows
- research/monitoring starter set

### `synthetic-employee-core`
- conversation core
- Telethon presence
- autonomous routines
- research starter allowance

### `matt-support-core`
- support conversation core
- Planck/customer lookup
- Telethon/internal support surface

### `matt-account-manager-core`
- relationship conversation core
- proactive research/follow-up
- summary/reporting

## 9. Code structure

Recommended modules:

- `lib/use-cases/`
- `lib/catalog/`
- `lib/skills/`
- `lib/implementations/`
- `lib/entitlements/`
- `lib/loadouts/`
- `lib/runtime/`
- `lib/fallback/`
- `lib/billing/`

Key implementation rule:
registries can initially be code-defined and synced into Prisma via upsert.

This avoids blocking on a separate admin CMS or seed system.

## 10. Rollout plan

### Phase 1
- add schema
- add registries
- add provisioning/loadout resolution
- add entitlement grant/allowance logic

### Phase 2
- wire agent creation to a default use-case template
- expose loadout and internal catalog APIs
- expose usage resolution and ledger APIs

### Phase 3
- add add-on attach flow
- add top-up flow
- add fallback resolution behavior

### Phase 4
- wire runtime engines to the new skill resolution path
- connect paid capabilities to real execution paths
- add UI surfaces for included items and remaining usage

## 11. Why this architecture is the right one

It preserves a simple sales story:
- “hire an agent for a use case”

while enabling a flexible engine underneath:
- base bundles
- paid skills/items
- premium allowances
- top-ups
- fallbacks
- imported/forked external runtime code

without forcing MeetMatt to become a thin wrapper over another framework.

## 12. One-line architectural principle

**MeetMatt sells bundles, equips agents with loadouts, meters entitlements separately, and executes everything through Matt-owned contracts even when the underlying code is borrowed or forked.**
