# MeetMatt Product Brief: Agent Capability Commerce (v2 - Elevated)

**Date:** March 6, 2026
**Status:** Product architecture brief (elevated via PM Strategy Canvas, Value Proposition, Monetization, NSM, ICP, GTM, Growth Loops, and Positioning frameworks)
**Audience:** CPO / product / GTM / growth
**Changelog:** v2 adds vision, ICP, value proposition, North Star metric, pricing model, trade-offs, defensibility, growth loops, GTM strategy, and competitive positioning missing from v1.

---

## PM Framework Evaluation of v1

Before the elevated brief, here is a structured gap analysis of v1 against 8 PM frameworks:

| Framework | v1 Coverage | Gap |
|---|---|---|
| Product Strategy Canvas (9 sections) | 2/9 (value prop sketch, capabilities) | Missing: vision, market segments by JTBD, relative costs, trade-offs, North Star, growth strategy, defensibility |
| Value Proposition (6-part JTBD) | Implicit "How" only | Missing: Who, Why, What Before, What After, Alternatives |
| Monetization Strategy | Base subscription + top-up mentioned | No concrete models evaluated, no unit economics, no validation experiments |
| Pricing Strategy | "Base subscription price" mentioned | No pricing model analysis, no tiers, no value metric, no competitive pricing |
| North Star Metric | 8 metrics listed (section 11) | No NSM identified, no business game classified, no input metrics hierarchy |
| Ideal Customer Profile | Not addressed | No demographics, JTBD for buyer, buying behavior, or disqualification criteria |
| GTM Strategy | Not addressed | No channels, messaging, launch plan, or success metrics framework |
| Growth Loops | Not addressed | No growth mechanism designed |
| Positioning | Not addressed | No competitive landscape, no positioning statement |

**v1 Verdict:** Strong internal product model (bundles, items, premium usage). Almost entirely missing external strategy (who buys, why, how we reach them, how we win, what we charge, how we grow). The brief reads like a product architecture memo, not a product strategy. Elevating it below.

---

## 1. Vision

MeetMatt exists to make AI agents accessible as real business workers, not as software to configure.

We believe:
- Every business should be able to hire an AI agent as easily as posting a job
- Agents should come ready for a role, not require assembly from raw parts
- Premium capabilities should be transparent, not hidden behind opaque credits
- The platform should feel like staffing, not like infrastructure provisioning

**Aspiration:** Become the default platform where businesses hire, equip, and manage AI workers by use case.

## 2. Market Segments (defined by JTBD)

Markets are defined by people's problems, not demographics.

### Segment 1: Solo operators and micro-businesses (1-10 people)
- **JTBD:** "I need help with customer support / sales / research but can't afford to hire someone"
- **Desired outcome:** Delegate repetitive work to a reliable agent that handles it 24/7
- **Constraints:** Low budget, no technical team, needs to work out of the box
- **Why first:** Fastest adoption cycle, lowest sales friction, highest volume, best PLG fit

### Segment 2: SMB teams (10-100 people) scaling operations
- **JTBD:** "I need to extend my team's output without proportionally growing headcount"
- **Desired outcome:** Agents that plug into existing workflows (CRM, Telegram, email) and handle defined roles
- **Constraints:** Needs integration, moderate budget, wants ROI visibility
- **Why second:** Higher LTV, stronger expansion revenue, validates use-case bundles

### Segment 3: Agencies and service businesses managing client work
- **JTBD:** "I need AI workers that can be deployed per-client without exposing my internal processes"
- **Desired outcome:** White-label or multi-tenant agent deployment with clear cost per agent
- **Constraints:** Needs per-client billing, reporting, and isolation
- **Why third:** Fleet-level monetization, highest LTV, but requires multi-agent maturity

## 3. Ideal Customer Profile (ICP)

**Primary ICP (launch):**
- Solo founder or small team (1-5 people)
- Running a service, agency, or e-commerce business
- Already using Telegram and/or a basic CRM
- Tech-comfortable but not a developer
- Budget: $50-200/month for automation
- Currently using: a VA, ChatGPT manually, or doing it themselves
- **Buying trigger:** Overwhelmed by repetitive customer/ops work, can't hire fast enough

**Disqualification criteria:**
- Enterprise with procurement cycles > 60 days
- Businesses requiring on-premise deployment
- Customers who want to build their own agent framework (they want the tools, not the worker)

## 4. Value Proposition

Using the 6-part JTBD framework:

### For Solo Operators (primary segment)

| Part | Content |
|---|---|
| **Who** | Solo founders and micro-business owners running service/e-commerce businesses |
| **Why** | They're drowning in repetitive customer support, research, and sales follow-up work they can't afford to delegate to a human |
| **What Before** | Manually answering the same questions, copy-pasting between tools, missing leads, working 14-hour days, or paying $500+/month for a part-time VA |
| **How** | MeetMatt lets them hire an AI agent for a specific role (Support, Sales, Research) that comes pre-loaded with the right capabilities and starts working immediately via Telegram/web |
| **What After** | 24/7 coverage on their most repetitive work, consistent quality, clear visibility into what the agent can do and what it costs, ability to upgrade specific capabilities as needs grow |
| **Alternatives** | ChatGPT (manual, no persistence, no role), virtual assistants ($500+/mo, time zones, training), custom AI development (>$10K, months), other agent platforms (require assembly, opaque pricing) |

**Value Proposition Statement:**
> MeetMatt is the only AI agent platform where you hire a ready-to-work agent for a specific job, see exactly what's included, and upgrade capabilities like equipping a team member, not configuring software.

## 5. Product Thesis

The right abstraction is:

- `Use case` = what we sell (the job the customer hires for)
- `Bundle` = what comes included (starter loadout)
- `Items` = what the customer sees as capabilities
- `Premium allowance` = what makes monetization precise

This avoids two bad product outcomes:

### Bad outcome 1: generic AI bundle
Everything is "included," but customers don't know what they're paying for, which capabilities are premium, why costs vary, or what can be upgraded.

### Bad outcome 2: raw tool marketplace
Customers must assemble the product from too many low-level capabilities, creating setup friction, pricing confusion, and low conversion.

The right model: sell the use case, expose the included items, recommend targeted upgrades.

## 6. Core Product Model

### 6.1 Use-case agent
The primary product the customer buys.

Launch set:
- **Support Agent** - handles customer inquiries, knowledge lookup, ticket triage, escalation
- **Research Employee** - background research, scheduled summaries, lightweight search
- **Painter Employee** - image generation with free/basic mode and premium allowance

Phase 2 set:
- Sales Assistant
- Lead Hunter
- Account Manager

### 6.2 Included bundle
Each use case comes with a default loadout. The customer doesn't assemble this.

### 6.3 Optional items (add-ons)
Purchasable upgrades: Painter, Research Pro, Competitor Watch, CRM Write Access, Voice Mode.

### 6.4 Premium usage
Metered allowances per item: 50 premium image generations, 250 premium research queries, 500 CRM write actions. Makes the offer tangible.

### 6.5 Premium specialists
Some expensive expert workers should be modeled as a distinct product layer, not as ordinary add-on items.

Examples:
- Coder
- Research Analyst
- Strategy Lead
- Designer / Painter Specialist

Why this matters:
- they use stronger models and more expensive workflows
- they need different quality expectations and budget ceilings
- they may require stricter approvals and tool permissions

Launch posture:
- internal and beta first
- not part of the base public Starter promise
- introduced after base use-case bundles are working and usage is understood

## 7. Customer-Facing Mental Model

The customer should explain their purchase in one sentence:

> "I hired this agent for X, it comes with Y, and I can add Z if I want."

UX priority order:
1. Job/use case first
2. Included items second
3. Extras third
4. Usage visibility fourth

Never expose: model providers, raw tools, backend runtimes, abstract credit systems.

### Product rollout guardrail
The backend capability commerce system can ship before the public pricing and landing story changes.

That means:
- keep the public offer simple until bundles, add-ons, top-ups, and fallback behavior are real and reliable
- do not force internal architecture terms into public marketing early
- treat future public packaging changes as a deliberate GTM launch, not an automatic consequence of backend work

## 8. Recommended Product Vocabulary

### Customer-facing
Use: Agent, Use Case, Included Items, Add-ons, Premium Usage, Top-up, Upgrade, Specialist.

### Internal
Keep: use-case templates, catalog items, skills, implementations, entitlements, loadouts.

## 9. Pricing Strategy

### Pricing model: Subscription + metered premium (hybrid)

This is the right model because:
- Subscription provides predictable revenue and simple initial conversion
- Metered premium captures value from power users without overpricing the base
- Add-ons create natural expansion without forcing tier upgrades

### Recommended structure

| Tier | Price | Target | Includes | Positioning |
|---|---|---|---|---|
| **Starter** | $5/day ($99/mo annual, $149/mo monthly) | Solo operators, testing | 1 agent, 1 use case, basic items, limited premium allowance | "Hire your first AI worker" |
| **Pro** | $12/day ($249/mo annual, $349/mo monthly) | Active small teams | 3 agents, all use cases, expanded premium, priority support | "Scale your AI team" |
| **Fleet** | Custom | Agencies, multi-client | Unlimited agents, shared packs, API access, dedicated support | "Deploy AI workers at scale" |

### Value metric
Per agent, per day. This aligns cost with value: more agents = more work handled = more value.

### Add-on pricing
- Painter pack (100 premium generations): $19
- Research Pro pack (500 premium queries): $29
- Competitor Watch (monthly): $15/agent
- Auto top-up: enabled per item, billed at pack rate

### Specialist pricing class (phase 2/3)
Premium specialists should be priced separately from base use-case agents.

Examples:
- Coder Specialist
- Research Analyst
- Strategy Lead

Recommended rule:
- do not bundle specialists into Starter by default
- launch them as premium worker seats or specialist packs after the base bundles validate
- treat them as higher-margin expansion, not core onboarding

### Unit economics targets
- CAC: < $50 (PLG-driven)
- LTV: > $500 (10+ month retention at Starter)
- LTV:CAC ratio: > 10:1
- Gross margin: > 70% (after inference costs via Cortex)
- Payback period: < 30 days

### Pricing assumptions to validate
- Willingness to pay $5/day for a single agent (vs free ChatGPT)
- Add-on attach rate > 20% in first 90 days
- Premium exhaustion rate creates top-up demand (not churn)

## 10. Monetization Model

### 10.1 Base offer
Each use-case agent: base subscription, predefined starter bundle, included premium allowances.

### 10.2 Add-on model
Attachable after base agent exists. Examples: add Painter to support agent, add Research Pro to researcher.

### 10.2b Specialist model
Some advanced capabilities should be sold as specialist workers rather than ordinary items.

This creates a cleaner product ladder:
- base use-case agent
- add-on items
- premium specialist workers

This is the right place for:
- coders
- research analysts
- strategists
- other high-cost expert operators

### 10.3 Top-up model
When premium exhausted: offer top-up pack, optionally auto-charge, otherwise fall back to cheaper/free mode.

### 10.4 Overage and fallback UX
1. Use included premium allowance first
2. If exhausted, offer top-up
3. If enabled, allow auto-charge
4. Otherwise fall back to cheaper/free mode
5. **Tell the user clearly that fallback happened** (silent downgrades create trust issues)

### 10.5 Shared packs
Default: per agent. Later: shared workspace packs, multi-agent packs, fleet packages (second-layer product).

## 11. Trade-offs (What We Will NOT Do)

Explicit trade-offs sharpen strategy. MeetMatt will NOT:

| Won't Do | Why |
|---|---|
| Expose raw model selection to customers | Kills simplicity; agents are workers, not API proxies |
| Build a tool marketplace where customers assemble from scratch | Creates setup friction, destroys conversion |
| Offer universal credit wallets in v1 | Harder to explain; item-specific allowances are clearer |
| Support on-premise deployment | Fragments the platform, slows iteration |
| Chase enterprise sales cycles before PLG works | Drains resources, delays product-market fit signal |
| Build custom agent frameworks for developers | We sell workers, not SDKs; devs aren't our ICP |
| Compete on price with ChatGPT | Different category; we sell roles, not chat sessions |

## 12. North Star Metric

### Business game classification: **Productivity Game**
MeetMatt helps customers get more done by delegating work to AI agents. Success = more work efficiently handled.

### North Star Metric
**Weekly Active Agents Completing Tasks (WAACT)**

An agent that completes tasks = a customer receiving value. This metric:
- Is customer-centric (reflects value delivered)
- Indicates habits (active agents = retained customers)
- Is quantitative and measurable
- Predicts revenue (active agents drive retention and expansion)
- Is actionable (product can improve task completion rates)

### Input metrics (driving the North Star)

| Input Metric | What It Measures | How Teams Influence It |
|---|---|---|
| **Agent activation rate** | % of created agents that complete 1st task within 24h | Onboarding, template quality, defaults |
| **Add-on attach rate** | % of agents with 1+ add-on within 90 days | Merchandising, recommendations, UX |
| **Premium utilization rate** | % of premium allowance consumed per billing cycle | Capability quality, use-case fit |
| **Top-up conversion rate** | % of exhaustion events that convert to top-up | Pricing, fallback UX, notification timing |
| **7-day agent retention** | % of agents still active after 7 days | Template quality, first-run experience |

### Metrics NOT to use as North Star
- Revenue (lagging, not customer-centric)
- Token counts (internal, not meaningful to customers)
- Number of agents created (vanity; creation without activation = waste)

## 13. Competitive Positioning

### Competitive landscape

| Competitor | Positioning | Gap they leave |
|---|---|---|
| ChatGPT / Claude (direct chat) | General-purpose AI conversation | No persistent agents, no role specialization, no business workflow |
| Custom GPTs / Assistants API | "Build your own" AI agent | Requires assembly, no billing/commerce, no bundled capabilities |
| Relevance AI / Flowise | AI workflow builders for technical users | Developer-first, complex setup, no use-case packaging |
| Synthflow / Air AI | Voice AI agents for sales/support | Narrow (voice only), expensive, no broader agent platform |
| Virtual assistants (human) | Delegated human labor | $500+/mo, time zones, training overhead, not scalable |

### MeetMatt positioning statement
> MeetMatt is the only AI agent platform where businesses hire ready-to-work agents by use case, with transparent included capabilities and clear upgrade paths, without needing to assemble tools or understand AI infrastructure.

### Strategic rationale
Everyone else either (a) sells raw AI tools that require assembly or (b) sells narrow single-purpose bots. MeetMatt owns the middle: **pre-packaged roles with expandable capabilities**. This is the "staffing agency" model for AI, not the "dev tools" model.

## 14. Growth Strategy

### Growth motion: Product-Led Growth (PLG) first

**Why PLG:** Low price point ($5/day), self-serve product, no enterprise sales team needed, segment 1 ICP is self-directed.

### Primary growth loops

**1. Usage Loop (primary)**
Customer hires agent -> agent handles customer-facing work (support replies, research reports, generated images) -> agent output is seen by customer's customers/stakeholders -> stakeholders ask "what tool is this?" -> discovery.

**2. Referral Loop (secondary)**
Customer gets value -> invited to refer for free premium pack -> referred customer activates -> both get extended allowances.

**3. Collaboration Loop (phase 2)**
Team member deploys agent -> invites colleagues to view agent dashboard -> colleagues deploy their own agents -> organic team expansion.

### GTM channels (launch)

| Channel | Why | Metric |
|---|---|---|
| Twitter/X (AI + indie hacker community) | Highest density of ICP segment 1 | Signups from social |
| Product Hunt launch | One-time spike + credibility | Launch day activations |
| Telegram communities | Users already on the platform agents deliver through | Agent activations from Telegram |
| Content (agent use-case stories) | SEO + education on the category | Organic signups |
| Existing MeetMatt user base | Warm audience, highest conversion | Upgrade/expansion rate |

### Launch plan

| Phase | Timeline | Focus |
|---|---|---|
| Pre-launch | Week -2 to 0 | Waitlist, teaser content, invite existing users to beta |
| Launch | Week 1 | Product Hunt, Twitter announcement, 3 hero use cases live |
| Post-launch | Week 2-4 | Content cadence (2x/week use-case stories), referral program live |
| Optimization | Week 5-12 | Measure NSM inputs, optimize activation, test add-on attach |

## 15. Product Instrumentation

The product team must measure:

| Metric | Category | Priority |
|---|---|---|
| WAACT (North Star) | Core | P0 |
| Agent activation rate (24h) | Activation | P0 |
| Conversion by use case | Acquisition | P0 |
| Add-on attach rate | Expansion | P0 |
| Specialist activation rate | Expansion | P1 |
| Premium usage exhaustion rate | Monetization | P0 |
| Top-up conversion rate | Monetization | P1 |
| Fallback rate | Quality | P1 |
| Revenue by item/add-on | Revenue | P1 |
| 7-day / 30-day agent retention | Retention | P0 |
| Downgrade dissatisfaction signals | Churn risk | P2 |

## 16. UX Implications

### Creation flow
Customer sees: what the use case does, what's included, 2-3 suggested upgrades. No configuration required.

### Agent dashboard
Customer sees: current role, equipped items, remaining premium usage, upgrade/top-up actions.

### Billing
Customer sees: base subscription, attached add-ons, top-ups, recent premium usage breakdown.

## 17. Example Productizations

### Support Agent
**Included:** conversation handling, knowledge lookup, ticket triage, escalation
**Optional:** Research Pro, Voice Mode, competitor monitoring
**Premium:** 100 knowledge lookups/month included

### Research Employee
**Included:** background research, scheduled summaries, lightweight search (50 searches/month)
**Optional:** Research Pro (500 searches), lead enrichment, premium reporting

### Painter Employee
**Included:** free/basic image generation (Nano Banana), 25 premium generations/month
**Optional:** larger premium packs, brand-style pack, social-creative workflow pack

### Coder Specialist
**Role:** premium expert worker for implementation-heavy or debugging-heavy work
**Included:** stronger model routing, code execution path, higher budget ceiling, stricter approval policy
**Optional:** repository-specific packs, premium debugging allowance, backoffice integration pack

## 18. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| One concept doing too much ("skill" = UI tile + purchasable item + runtime tool + quota bucket) | High | Strict separation: CatalogItem (customer), SkillDefinition (runtime), EntitlementPack (billing) |
| Generic credit wallet introduced too early | Medium | Start with item-specific allowances, defer universal credits |
| Empty templates that require manual assembly | High | Strong default bundles with zero-config activation |
| Premium exhaustion causing churn instead of top-up | High | Transparent fallback UX, proactive notification at 80% usage |
| $5/day feels expensive vs free ChatGPT | Medium | Messaging: "you're hiring a worker, not buying chat sessions" |
| Low add-on attach rate | Medium | In-context recommendations based on agent activity patterns |

## 19. Recommended Rollout

### Phase 1: Backend + admin
Ship architecture, internal admin surfaces, use-case template system.

### Phase 2: Starter bundles
3 strong starters: Support Agent, Research Employee, Synthetic Employee core.

### Phase 3: Premium add-ons
Launch Painter + Research Pro with visible allowance and top-up.

### Phase 4: Premium specialists
Launch premium specialist workers such as Coder, Research Analyst, and Strategy Lead.

### Phase 5: Customer surfaces
Top-ups, fallback transparency, usage visibility, referral program.

## 20. Defensibility (Can't/Won't Test)

Why competitors can't easily replicate MeetMatt:

| Moat Type | How MeetMatt Builds It |
|---|---|
| **Bundled use-case templates** | Curated loadouts tuned to real jobs; requires product taste, not just AI access |
| **Cortex inference routing** | 3-tier model routing optimizes cost/quality per task; hard to replicate without significant infra investment |
| **Metered commerce layer** | Item-level entitlements + fallback chains are a billing/runtime integration competitors would need to build from scratch |
| **Agent activity data** | As agents complete work, MeetMatt accumulates data on what works per use case, improving templates and recommendations |
| **Ecosystem lock-in** | Agents connected to Telegram, CRM, Planck = switching cost increases with integration depth |

## 21. One-Line Product Principle

**Sell the job, show the included items, meter the premium parts clearly, and make upgrades feel like equipping an agent rather than configuring software.**

## 22. One-Line Strategy

**MeetMatt wins by being the first platform where hiring an AI agent feels like hiring a person for a role, not like subscribing to a software tool.**
