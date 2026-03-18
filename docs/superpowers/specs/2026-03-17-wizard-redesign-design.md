# MeetMatt Wizard Redesign — Conversational Flow

**Date:** 2026-03-17
**Status:** Approved

## Overview

Replace the current 3-panel wizard (GuideRail / ConversationSpine / LiveCanvas) with a conversational flow where Matt guides users through agent setup like a chat. The Orb anchors the left side, the conversation thread flows on the right. Previous steps compress into history as you progress.

## Layout

### Desktop (≥768px)
- **Left (45%)**: NexusOrb centered vertically, ambient radial glow, "MATT" label below. Fixed — never moves or resizes between steps.
- **Right (55%)**: Conversation thread aligned to bottom. Current step has full interactive UI. Completed steps are compact history records above, progressively fading and compressing the older they get. Gradient fade overlay at the scroll top edge.

### Mobile (<768px)
- **Top**: NexusOrb shrinks to 64px, centered horizontally with compact glow. Fixed/sticky at top of viewport.
- **Below**: Conversation thread fills remaining viewport height, scrollable. Same history compression behavior. Touch-friendly tap targets (min 44px). Full-width cards and inputs with appropriate padding (24px horizontal).

### Responsive breakpoints
- `≥1200px`: Orb at 200px, generous spacing
- `768–1199px`: Orb at 160px, tighter right padding
- `<768px`: Vertical stack — 64px orb top, conversation below

## Steps

### Step 1 — Name
- **Matt says**: "Hey — I'm Matt. I'll help you build and deploy your AI agent in about two minutes."
- **Matt asks**: "What should we call them?"
- **UI**: 4 suggestion pills (Ada, Relay, Friday, Atlas) + text input with send button
- **On submit**: Name highlights in accent color, step compresses

### Step 2 — Role
- **Matt says**: "{name} — great name."
- **Matt asks**: "What role will {name} play?"
- **UI**: 2x2 grid of role cards with emoji, title, one-line description
  - 🤖 Assistant — "Answers questions, runs tasks"
  - 👔 Employee — "Works a shift, handles ops"
  - 🤝 Coworker — "Collaborates, shares context"
  - 📞 Front Desk — "First contact, routes & greets"
- **On select**: Card highlights with accent border + glow, step compresses after short delay
- **Mobile**: 2x2 grid maintained, cards stack to full-width only below 360px

### Step 3 — Features
- **Matt says**: "An {role} — solid."
- **Matt asks**: "What should {name} handle?"
- **Matt adds**: "Pick what fits, or describe it yourself."
- **UI**: Toggleable pill chips (dynamic per role selection) + free text input
- **Employee chips**: Customer support, Order tracking, Lead qualification, Appointment booking, FAQ answers, Onboarding
- **Assistant chips**: Research, Summarization, Writing, Code help, Data analysis, Scheduling
- **Coworker chips**: Brainstorming, Document review, Meeting prep, Status updates, Knowledge base
- **Front Desk chips**: Greeting, Routing, Intake forms, Availability check, FAQ, Escalation
- **Selected chips**: Accent border + accent text + checkmark prefix
- **On submit**: Selected chips shown as compact tags in history

### Step 4 — Login / Register
- **Matt says**: "Let's save your progress."
- **Matt adds**: "Sign in so {name} is ready when you come back."
- **UI**: Three auth buttons stacked vertically
  - Continue with Google (white card, Google logo)
  - Continue with email (dark card)
  - Connect wallet (dark card)
- **Auth provider**: Privy (existing integration)
- **On success**: Compact green checkmark + email/address in history

### Step 5 — Bot Token
- **Matt says**: "Now let's connect {name} to Telegram."
- **Matt adds**: "Open @BotFather on Telegram, create a bot, and paste the token here."
- **UI**: Monospace text input for token + send button. "Don't have a bot yet? Open BotFather →" link below.
- **Validation**: Real-time Telegram API validation (existing `getMe` call)
- **Verified state**: Green confirmation card with bot handle + "Verified — ready to deploy"
- **On verify**: Step compresses showing bot handle with green checkmark

### Step 6 — Pay & Deploy
- **Matt says**: "{name} is ready to go live."
- **UI**: Summary card with all selections (name, role, features, bot handle) + divider + pricing. Two CTA buttons side by side: "Deploy {name}" (accent gradient, primary) and "$150/mo" (secondary outline).
- **Pricing**: Day pass $5/day (primary CTA) or Monthly $150/mo (secondary)
- **On deploy**: Progress animation, then success state with "Open in Telegram" link

## Conversation History Behavior

### Compression rules
- **1 step back**: Shows Matt's question (muted) + your answer (accent-colored, in a small card). Opacity 0.6.
- **2 steps back**: Same but opacity 0.45, slightly smaller font.
- **3+ steps back**: Collapses to a single line with key-value pairs (e.g., "Name: Atlas · Role: Employee"). Opacity 0.35.

### Transitions
- **Step completion**: Current step content animates up (y: 0 → -20, opacity 1 → 0.6) while compressing height. Takes ~300ms with easeOut.
- **New step entry**: Fades in from below (y: 20 → 0, opacity 0 → 1). Takes ~250ms with easeOut. Slight delay after compression completes.
- **Scroll**: Conversation container scrolls to bottom on each new step. Gradient fade overlay (60px) masks the top edge.

## Components

### Removed
- `WizardChrome.tsx` (GuideRail, ConversationSpine, LiveCanvas, StateBanner, RecoveryPanel)
- `StepPersonality.tsx` (personality picker — gone entirely)
- `StepDemo.tsx` (forced demo chat — gone entirely)

### Modified
- `page.tsx` — Simplified wizard integration. Two-zone layout (orb + thread) instead of three-panel chrome.
- `NexusOrb.tsx` — Add responsive sizing prop. Desktop: 200px, tablet: 160px, mobile: 64px.

### New
- `WizardThread.tsx` — Main conversation thread component. Manages step history, compression, scroll position, transitions.
- `WizardMessage.tsx` — Single message from Matt (text + optional interactive content). Handles both active state (full UI) and history state (compact).
- `StepName.tsx` — Rewrite: name suggestions as pills + text input, conversational framing.
- `StepRole.tsx` — New: 2x2 role card grid.
- `StepFeatures.tsx` — New: dynamic chip toggles per role + free text.
- `StepLogin.tsx` — New: auth buttons (Privy integration).
- `StepToken.tsx` — Rewrite of StepTelegram: simplified paste + verify flow.
- `StepDeploy.tsx` — Rewrite: summary card + pricing + deploy CTA.

### Types update
```typescript
type Step = "idle" | "name" | "role" | "features" | "login" | "token" | "deploy"

interface StepRecord {
  step: Step
  mattMessage: string
  userAnswer: string | string[]
  icon?: string
  timestamp: number
}

interface WizardState {
  currentStep: Step
  history: StepRecord[]
  agentName: string
  role: string
  features: string[]
  isAuthenticated: boolean
  botToken: string | null
  botHandle: string | null
  deployStatus: "idle" | "deploying" | "completed" | "failed"
}
```

## Mobile Optimizations

- **Orb**: 64px, sticky at top with 32px vertical padding, compact glow (120px blur radius)
- **Conversation**: Full viewport width minus 24px horizontal padding
- **Role cards**: 2x2 grid maintained down to 360px, then 1-column stack
- **Feature chips**: Wrap naturally, full-width text input below
- **Auth buttons**: Full-width stacked
- **Token input**: Full-width, larger touch target (48px height)
- **Deploy CTA**: Full-width stacked (deploy button above, monthly option below)
- **History compression**: Same rules, but collapses to single-line sooner (2+ steps back) to save vertical space
- **Scroll**: Native momentum scroll, no custom scrollbar on mobile
- **Safe areas**: Respect `env(safe-area-inset-*)` for notched devices

## Animation

- Framework: Framer Motion (existing dependency)
- Step transitions: `AnimatePresence` with `mode="wait"`
- History compression: `layout` animation on height + opacity
- Chip selection: Scale spring (0.95 → 1.0) + border color transition
- Deploy progress: Circular SVG progress (existing pattern from StepDeploy)
- Orb: Existing NexusOrb animations unchanged (idle/speaking/listening/thinking states)

## Styling

- No changes to color palette, typography, or design tokens
- Remove all `.wizard-*` CSS classes from `globals.css` (replaced by Tailwind + component styles)
- Glassmorphism retained for cards and inputs (existing `brand-panel` patterns)
- Accent color (#ff6b35) for selected states, user answers in history
- Muted grays for Matt's text, faded history

## Payment Flow

The existing `PaymentModal` component and payment infrastructure are retained. Step 6 wires into them:

1. User clicks "Deploy {name}" ($5/day) or "$150/mo" → sets `launchOffer` state
2. This triggers the existing `PaymentModal` (Stripe/crypto checkout) as an overlay
3. On `handlePaymentSuccess` → calls `createPendingAgent` with Privy access token → begins deploy polling
4. Deploy progress shows inline in the conversation thread (replaces the current `StepDeploy` progress UI)
5. Terms acceptance checkbox is embedded in the summary card above the CTAs

The payment modal is NOT conversational — it stays as a modal overlay. Only the surrounding wizard chrome changes.

### Step 6 CTA clarification
- **Primary CTA**: "Deploy {name} — $5/day" (accent gradient). This is the day pass.
- **Secondary CTA**: "$150/mo" (outline). This is the monthly plan.
- Both trigger `PaymentModal` with the respective `launchOffer` value.

## Auth State Persistence

Privy auth can cause page redirects. To prevent losing wizard progress:

1. Before calling `login()`, serialize `WizardState` to `sessionStorage` under key `meetmatt-wizard-state`
2. On page load, check `sessionStorage` for saved state. If found AND user is now authenticated (Privy `authenticated` status), restore state and advance to Step 5 (token).
3. Clear `sessionStorage` on wizard completion or manual abandon.
4. The `usePrivy()` hook provides `authenticated` boolean and `user` object — no custom auth state needed beyond Privy's.

## Back Navigation

No explicit back button. The conversational flow is forward-only by design. However:

- Users can click on a compressed history record to re-expand and edit that step
- Editing a previous step clears all subsequent history records (answers after that step are invalidated)
- The re-expanded step shows the previous answer pre-filled
- This avoids complex back-navigation state while allowing corrections

## Orb State Mapping

```typescript
function getOrbState(step: Step): OrbState {
  switch (step) {
    case "idle": return "idle"
    case "name": return "speaking"     // Matt is asking
    case "role": return "speaking"
    case "features": return "speaking"
    case "login": return "idle"        // Waiting for external auth
    case "token": return "listening"   // Waiting for paste
    case "deploy": return "thinking"   // Processing
    default: return "idle"
  }
}
```

## NexusOrb Responsive API

Replace `orbClassName` with a `size` prop:

```typescript
interface NexusOrbProps {
  size: "sm" | "md" | "lg"  // 64px | 160px | 200px
  state?: "idle" | "speaking" | "listening" | "thinking"
}
```

The parent layout determines which size to pass based on viewport (via Tailwind `md:` / `lg:` breakpoints or a `useMediaQuery` hook). The Orb itself is not responsive — it receives an explicit size.

## Types — Full Replacement

The new types replace `types.ts` entirely. The old `WizardState` string union, `Conversation`, `Message`, and `ProgressTrace` types are removed. The `getWizardState()` function in `page.tsx` is removed (it mapped to the old 3-panel chrome states).

```typescript
// wizard/types.ts — complete replacement

type Step = "idle" | "name" | "role" | "features" | "login" | "token" | "deploy"

interface StepRecord {
  step: Step
  mattMessage: string
  userAnswer: string | string[]  // string[] for features (multi-select)
  displayAnswer: string          // What shows in compressed history (e.g., bot handle, not raw token)
  icon?: string
  timestamp: number
}

interface WizardConfig {
  currentStep: Step
  history: StepRecord[]
  agentName: string
  role: string
  features: string[]
  isAuthenticated: boolean
  botToken: string | null
  botHandle: string | null
  launchOffer: "day_pass" | "monthly" | null
  deployStatus: "idle" | "deploying" | "completed" | "failed"
}
```

Note: Renamed from `WizardState` to `WizardConfig` to avoid collision during migration. Once old code is fully removed, can rename back if desired.

## CSS Migration

All `.wizard-*` classes are removed from `globals.css`. New components use Tailwind utility classes exclusively. Key mappings:

| Old class | New approach |
|-----------|-------------|
| `.wizard-choice-chip` | Tailwind: `rounded-full border px-4 py-2 text-sm transition-colors` + conditional accent classes |
| `.wizard-input-shell` | Tailwind: `bg-[#0f0f17] border border-[#222] rounded-[14px] p-4 flex items-center gap-3` |
| `.wizard-guide-rail` | Removed (no sidebar) |
| `.wizard-conversation-spine` | Replaced by `WizardThread` with flex-col layout |
| `.wizard-live-canvas` | Removed (no right panel) |
| `.wizard-preview-card` | Tailwind: `bg-[#1a1a22] border border-[#2a2a35] rounded-[14px] p-5` |
| `.wizard-progress-trace` | Removed (replaced by conversation history) |
| `.wizard-bubble` | Removed (no chat bubbles — text flows naturally) |

Remaining `.brand-*` classes (`.brand-button`, `.brand-panel`, `.brand-pill`) are kept unchanged.

## Scroll Behavior

- Use `scrollIntoView({ behavior: "smooth", block: "end" })` on the active step container after each transition
- If user has manually scrolled up (detected via `scrollTop < scrollHeight - clientHeight - 50px`), do NOT auto-scroll — show a "↓ New step" indicator at the bottom instead
- Clicking the indicator scrolls to bottom and dismisses it

## Animation Reconciliation

Use `AnimatePresence mode="popLayout"` (not `"wait"`) to allow compression and entry to overlap slightly. The exiting step compresses via `layout` while the entering step fades in with `initial/animate`. This avoids the timing conflict between `mode="wait"` and layout animations.

## Mobile History Compression

On mobile (<768px), history compresses more aggressively:

- **1 step back**: Compact record (Matt question + your answer). Opacity 0.5.
- **2+ steps back**: Single-line key-value. Opacity 0.3.

Detection: Use CSS `@container` query on the thread container, or a `useIsMobile()` hook (existing pattern: `window.matchMedia("(max-width: 767px)")`). The compression level is a prop on `WizardMessage`: `compressionLevel: "full" | "compact" | "collapsed"`.

## Error Handling

- **Token validation failure**: Inline error below input, input shakes (Framer spring), can retry
- **Auth failure**: Inline error, retry buttons remain visible. Matt says "No worries, try again."
- **Deploy failure**: Matt says "Hit a snag — let me try again" with retry button
- **Network error**: Toast notification, current step preserved, can retry
- **Privy redirect failure**: `sessionStorage` state restored on return, user sees Step 4 pre-filled
