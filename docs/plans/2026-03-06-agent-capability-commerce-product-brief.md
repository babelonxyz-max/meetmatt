# MeetMatt Product Brief: Use-Case Agents, Items, and Paid Capabilities

**Date:** March 6, 2026  
**Status:** Product architecture brief  
**Audience:** CPO / product / GTM / growth

## 1. Executive summary

MeetMatt should not sell “a generic AI agent with everything inside.”

MeetMatt should sell:
- **agents by use case**
- with a clear **starter bundle**
- plus optional **extra items**
- plus visible **included premium usage**

This gives us a product that is:
- easier to understand
- easier to merchandise
- easier to upsell
- easier to meter
- better aligned with real use cases

In simple product language:

1. the customer hires an agent for a job
2. that agent comes with a set of built-in items
3. some items include premium allowance
4. the customer can add more items later
5. when premium allowance runs out, the system offers top-up, auto-charge, or a disclosed fallback

## 2. Product thesis

The right abstraction is:

- `Use case` = what we sell
- `Bundle` = what comes included
- `Items` = what the customer sees as capabilities
- `Premium allowance` = what makes monetization precise

This lets us avoid two bad product outcomes:

### Bad outcome 1: generic AI bundle

Everything is “included,” but customers do not know:
- what they are paying for
- which capabilities are premium
- why costs vary
- what can be upgraded

### Bad outcome 2: raw tool marketplace

Customers are forced to assemble the product from too many low-level capabilities.

That creates:
- setup friction
- pricing confusion
- low conversion

The better model is:
- sell the use case
- expose the included items
- recommend targeted upgrades

## 3. Core product model

### 3.1 Use-case agent

This is the primary product the customer buys.

Examples:
- Support Agent
- Sales Assistant
- Research Employee
- Painter Employee
- Lead Hunter

### 3.2 Included bundle

Each use case comes with a default loadout of items.

Examples of what can be included:
- communication ability
- research ability
- CRM connection
- reporting
- monitoring
- premium generations/searches

### 3.3 Optional items

These are purchasable upgrades or add-ons.

Examples:
- Painter
- Research Pro
- Competitor Watch
- CRM Write Access
- Voice Mode

### 3.4 Premium usage

Some items should include metered premium allowance.

Examples:
- 50 premium image generations
- 250 premium research queries
- 500 CRM write actions

This makes the offer tangible and avoids “unlimited but actually limited” confusion.

## 4. Customer-facing mental model

The customer should be able to explain their purchase in one sentence:

> “I hired this agent for X, it comes with Y, and I can add Z if I want.”

That means the UX should emphasize:
- job/use case first
- included items second
- extras third
- usage visibility fourth

Not:
- model providers
- raw tools
- backend runtimes
- abstract credit systems

## 5. Recommended product vocabulary

### Customer-facing

Use:
- Agent
- Use Case
- Included Items
- Add-ons
- Premium Usage
- Top-up
- Upgrade

Avoid exposing internal words like:
- skill definition
- implementation
- entitlement
- runtime engine
- fallback policy

### Internal

Internally we still keep the deeper model:
- use-case templates
- catalog items
- skills
- implementations
- entitlements
- loadouts

## 6. Packaging model

### 6.1 Base offer

Each use-case agent has:
- a base subscription price
- a predefined starter bundle
- one or more included premium allowances where relevant

### 6.2 Add-on model

Add-ons should be attachable after the base agent exists.

Examples:
- add Painter to a support or sales agent
- add Research Pro to a researcher
- add Planck backoffice access to an internal-style operator

### 6.3 Top-up model

When a premium item runs low or is exhausted:
- offer top-up pack
- optionally allow auto-charge
- otherwise fall back to cheaper/free mode if that path exists

### 6.4 Shared packs

Default should be **per agent**.

Later, we can add:
- shared workspace packs
- multi-agent packs
- fleet-level packages

But this should be treated as an advanced second-layer product, not the default.

## 7. Example productization

### Support Agent

Included:
- conversation handling
- knowledge lookup
- ticket triage
- escalation

Optional add-ons:
- Research Pro
- Voice Mode
- competitor monitoring

### Research Employee

Included:
- background research
- scheduled summaries
- lightweight search allowance

Optional add-ons:
- Research Pro
- lead enrichment
- premium reporting

### Painter Employee

Included:
- free/basic image generation
- limited premium image generation allowance

Optional add-ons:
- larger premium generation packs
- brand-style pack
- social-creative workflow pack

This is the example where “Nano Banana free limited, Painter premium included” makes sense as a product story.

## 8. Overage and fallback UX

This is a product decision, not only a billing decision.

Recommended behavior:

1. use included premium allowance first
2. if exhausted, offer top-up
3. if enabled, allow auto-charge
4. otherwise fall back to cheaper/free mode
5. tell the user clearly that fallback happened

This is important because silent downgrades create trust issues.

## 9. Why this model is stronger commercially

### 9.1 Better initial conversion

Selling by use case is easier than selling by tool bundle.

### 9.2 Better expansion revenue

Once the agent exists, attachable items create natural upsell paths.

### 9.3 Better margin control

Premium usage is metered and visible instead of hidden inside flat pricing.

### 9.4 Better product clarity

Customers understand:
- what is included
- what is premium
- what can be upgraded

## 10. Product risks to avoid

### Risk 1: one concept doing too much

If “skill” means:
- a UI tile
- a purchasable item
- a runtime tool
- a quota bucket
- a backend provider

then the system becomes confusing both internally and externally.

### Risk 2: generic credit wallet too early

A universal credit wallet is flexible but harder to explain.

It is better to start with:
- use-case bundles
- clear included allowances
- item-specific top-ups

### Risk 3: empty templates

If customers must assemble everything manually, setup friction becomes too high.

Templates should start with a strong predefined bundle.

## 11. Product instrumentation

The product team should be able to measure:
- conversion by use case
- attach rate of optional items
- premium usage exhaustion rate
- top-up conversion rate
- fallback rate
- downgrade dissatisfaction signals
- revenue by item/add-on
- retention by use-case bundle

These metrics matter more than raw token counts from a product perspective.

## 12. UX implications

### Creation flow

The customer should see:
- what the use case does
- what is included
- a small number of suggested upgrades

### Agent dashboard

The customer should see:
- current agent role
- equipped items
- remaining premium usage where relevant
- upgrade/top-up actions

### Billing

The customer should see:
- base subscription
- attached add-ons
- top-ups
- recent premium usage

## 13. Recommended rollout

### Phase 1

Ship the backend architecture and internal admin surfaces first.

### Phase 2

Support a few strong starter bundles:
- Support Agent
- Research Employee
- Synthetic Employee core

### Phase 3

Launch 1-2 premium add-ons with visible allowance:
- Painter
- Research Pro

### Phase 4

Add top-ups, fallback transparency, and usage visibility to customer surfaces.

## 14. Final recommendation

MeetMatt should be designed as:

**a platform where customers hire agents for jobs, receive a predefined set of included items, and can expand those agents with premium capabilities over time.**

That is much more understandable and monetizable than:
- generic all-in-one agents
- raw tool marketplaces
- opaque credit-only systems

## 15. One-line product principle

**Sell the job, show the included items, meter the premium parts clearly, and make upgrades feel like equipping an agent rather than configuring software.**
