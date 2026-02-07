# Meet Matt V2 - Product Requirements Document
## AI Agent Deployment Platform - Onboarding & Experience Redesign

---

## Executive Summary

**Current State:** Product works but has 6,000+ lines of dead code, confusing user flow, and broken Devin integration.  
**Goal:** Streamlined, trustworthy onboarding that converts visitors to paying customers in <5 minutes.

---

## 1. Problems Identified from Real User Testing

### 🔴 Critical Flow Issues

| Issue | Impact | Evidence |
|-------|--------|----------|
| **Payment before agent creation** | User anxiety - paying for something they can't see | User asked "what did I pay for?" |
| **No preview of bot capability** | Low trust, unclear value proposition | User hesitated at payment step |
| **Devin integration unreliable** | Bot never actually created | Session failed, no fallback |
| **Privy auth friction** | Login required before seeing value | 40% drop-off at login step |
| **No progress visibility** | User doesn't know what's happening | "Is it working?" confusion |
| **Complex scope selection** | Too many options, decision paralysis | 5 scope options overwhelming |

### 🟡 Technical Debt Impact

- **Dead code confusion:** Developers can't tell what's active
- **Mock data everywhere:** Billing page, provisioning - all fake
- **Multiple overlapping APIs:** 3 different deploy endpoints
- **No error recovery:** If Devin fails, user is stuck

---

## 2. Matt V2 - Core Philosophy

### "See First, Pay Last"

**Old Flow:**  
Name → Login → Use Case → Scope → Contact → **PAY** → Deploy → Wait

**New Flow:**  
Name → **See Bot Preview** → Use Case → **Quick Demo** → Login → **PAY** → Instant Deploy

### Key Principles

1. **Immediate Value** - Show something within 30 seconds
2. **Progressive Disclosure** - Don't ask for auth until necessary
3. **Trust Through Transparency** - Always show status/progress
4. **Graceful Degradation** - If Devin fails, offer alternatives
5. **Single Source of Truth** - One deploy API, clear code structure

---

## 3. V2 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: LANDING (0:00)                                         │
│  ├─ AI Orb reacts to cursor (playful)                           │
│  ├─ "Meet Matt - Your AI Assistant in 2 Minutes"               │
│  └─ CTA: "Create My Bot" → No signup required                  │
├─────────────────────────────────────────────────────────────────┤
│  STEP 2: NAME & PREVIEW (0:15)                                  │
│  ├─ "What should I call you?"                                   │
│  ├─ Live bot preview updates:                                   │
│  │   "Hi! I'm [NAME]. I'll help you with..."                   │
│  └─ CTA: "Continue"                                             │
├─────────────────────────────────────────────────────────────────┤
│  STEP 3: PERSONALITY (0:30)                                     │
│  ├─ "What's your style?"                                        │
│  ├─ Simple cards:                                               │
│  │   ├─ 💼 Professional (formal, efficient)                     │
│  │   ├─ 🤝 Friendly (casual, warm)                              │
│  │   └─ 🚀 Hustler (fast, direct)                               │
│  └─ Shows sample response for each                             │
├─────────────────────────────────────────────────────────────────┤
│  STEP 4: USE CASE & DEMO (0:45)                                 │
│  ├─ "What will you use me for?"                                 │
│  ├─ Categories:                                                 │
│  │   ├─ 📅 Personal Assistant                                   │
│  │   ├─ 💼 Business Automation                                  │
│  │   └─ 🎯 Lead Generation                                      │
│  └─ ⚡ Live Demo: Chat with preview bot (3 messages free)       │
├─────────────────────────────────────────────────────────────────┤
│  STEP 5: AUTH & PAYMENT (1:30)                                  │
│  ├─ "Ready to deploy?" (now they want it!)                      │
│  ├─ Quick Privy login (email/wallet)                           │
│  ├─ Simple pricing: "$99/month - First week free"              │
│  └─ One-click payment (saved methods or crypto)                │
├─────────────────────────────────────────────────────────────────┤
│  STEP 6: INSTANT DEPLOY (2:00)                                  │
│  ├─ Live deployment progress bar                                │
│  ├─ Behind the scenes:                                          │
│  │   ├─ Create Telegram bot via Devin                          │
│  │   ├─ Configure with selected personality                    │
│  │   └─ Send auth code to user                                 │
│  └─ Result: Bot link + QR code + "Add to Telegram"             │
└─────────────────────────────────────────────────────────────────┘
```

**Total Time:** 2-3 minutes  
**Total Steps:** 6 (down from 7)  
**Key Improvement:** Try before paying!

---

## 4. Technical Architecture - Clean Slate

### 4.1 Directory Structure (Clean)

```
meetmatt/
├── app/
│   ├── (wizard)/                    # New onboarding flow
│   │   ├── page.tsx                  # Main wizard (unified)
│   │   ├── layout.tsx
│   │   └── preview/                  # Bot preview page
│   ├── api/
│   │   ├── v2/                       # Versioned API
│   │   │   ├── agents/
│   │   │   │   └── route.ts          # Single deploy endpoint
│   │   │   ├── payments/
│   │   │   │   └── route.ts          # Stripe + Crypto
│   │   │   ├── preview/
│   │   │   │   └── route.ts          # Bot preview generation
│   │   │   └── webhooks/
│   │   │       ├── devin/route.ts    # Devin completion webhook
│   │   │       └── stripe/route.ts   # Payment webhooks
│   │   └── health/route.ts
│   ├── dashboard/
│   ├── components/
│   │   ├── wizard/                   # Wizard-specific components
│   │   │   ├── WizardContainer.tsx
│   │   │   ├── StepName.tsx
│   │   │   ├── StepPersonality.tsx
│   │   │   ├── StepDemo.tsx
│   │   │   ├── StepPayment.tsx
│   │   │   └── StepDeploy.tsx
│   │   ├── ui/                       # shadcn components only
│   │   ├── AIOrb.tsx
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── layout.tsx
├── lib/
│   ├── services/                     # Business logic (not API)
│   │   ├── agent.service.ts          # Agent CRUD
│   │   ├── payment.service.ts        # Payment processing
│   │   ├── devin.service.ts          # Devin integration
│   │   └── preview.service.ts        # Bot preview generation
│   ├── prisma.ts
│   ├── stripe.ts                     # Stripe client
│   └── utils.ts
├── prisma/
│   └── schema.prisma
└── types/
    └── index.ts                      # Shared TypeScript types
```

### 4.2 Files to Delete (6,000+ lines)

**Components (18 files):**
- `JarvisInterface.tsx` - Unused legacy
- `LaunchWizard.tsx` - Replaced by page.tsx
- `VisualBackground.tsx`, `AnimatedBackground.tsx` - Excess
- `SkipLink.tsx`, `FocusTrap.tsx` - Over-engineered
- `KeyboardShortcuts.tsx` - Unused
- `ScrollProgress.tsx`, `PageTransition.tsx` - Visual noise
- `DeploymentProgress.tsx` - Duplicate
- `Confetti.tsx`, `CopyButton.tsx` - Unused
- `Badge.tsx`, `EmptyState.tsx`, `Skeleton.tsx` - Use shadcn
- `Tooltip.tsx`, `ThemeToggle.tsx`, `LoadingSpinner.tsx` - Use shadcn

**API Routes (12 files):**
- `/api/provision/` - Legacy
- `/api/seed/` - One-time use
- `/api/test/` - Debug
- `/api/deploy-for-user/` - Duplicate
- `/api/check-pool/` - Unused
- `/api/track-local/` - Overkill
- `/api/admin/test-devin/` - Debug
- `/api/admin/devin-debug/` - Debug
- `/api/admin/create-devin-session/` - Redundant
- `/api/admin/analytics/` - Not used
- `/api/admin/check/` - Unused
- `/api/admin/wallet-pool/` - Unused

**Library (entire folders):**
- `lib/provisioning/` - 15 files, legacy
- `lib/walletPool.ts` - Unused
- `lib/crypto-payment.ts` - Replaced
- `services/` - Empty microservices

**Documentation:**
- Old docs referencing deprecated features

### 4.3 New Services Required

| Service | Purpose | Provider Options |
|---------|---------|------------------|
| **Stripe** | Primary payments (cards) | Stripe |
| **NowPayments** | Crypto payments (BTC, ETH, USDT) | NowPayments |
| **OpenAI** | Bot preview generation | OpenAI API |
| **Devin** | Bot deployment | Cognition Labs |
| **Telegram Bot API** | Bot creation & management | Telegram |
| **PostHog/Amplitude** | Analytics | PostHog |
| **LogSnag** | Real-time notifications | LogSnag |

---

## 5. Database Schema Changes

### 5.1 Simplified Schema

```prisma
model User {
  id            String    @id @default(cuid())
  privyId       String    @unique
  email         String?
  walletAddress String?
  createdAt     DateTime  @default(now())
  
  agents        Agent[]
  payments      Payment[]
}

model Agent {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // Core
  name            String
  slug            String   @unique
  personality     String   // professional, friendly, hustler
  useCase         String   // assistant, business, leads
  
  // Preview (generated before payment)
  previewConfig   Json?    // Sample responses, avatar
  
  // Deployment
  status          String   @default("preview") // preview, pending, deploying, active, failed
  telegramBotId   String?
  telegramLink    String?
  authCode        String?
  
  // Billing
  subscriptionStatus String @default("trial") // trial, active, cancelled
  trialEndsAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Payment {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  agentId     String?
  
  amount      Float
  currency    String
  status      String   // pending, completed, failed
  provider    String   // stripe, nowpayments
  
  createdAt   DateTime @default(now())
}
```

### 5.2 Removed Tables
- `WalletPool` - Not used
- `analytics_events` - Use PostHog instead
- `provisioning_*` - Legacy

---

## 6. API Design - v2

### 6.1 Single Deploy Endpoint

```typescript
// POST /api/v2/agents
{
  "name": "ODONATUM",
  "personality": "professional",
  "useCase": "assistant",
  "previewConfig": { /* from preview step */ }
}

// Response
{
  "id": "agent_123",
  "status": "deploying",
  "telegramLink": "https://t.me/ODONATUM_bot",
  "authCode": "837291",
  "estimatedReady": "2026-02-07T11:00:00Z"
}
```

### 6.2 Preview Generation

```typescript
// POST /api/v2/preview
{
  "name": "ODONATUM",
  "personality": "professional",
  "useCase": "assistant"
}

// Response
{
  "sampleResponses": [
    "Hello! I'm ODONATUM, your professional assistant...",
    "I've scheduled that meeting for you..."
  ],
  "avatarUrl": "https://...",
  "capabilities": ["scheduling", "email", "reminders"]
}
```

### 6.3 Webhooks

```typescript
// Devin Webhook - POST /api/v2/webhooks/devin
{
  "sessionId": "devin_123",
  "status": "completed",
  "output": {
    "botUsername": "ODONATUM_bot",
    "authCode": "837291"
  }
}
```

---

## 7. Key Features - Matt V2

### 7.1 Bot Preview (NEW)
- Generate sample responses using OpenAI
- Show avatar placeholder
- Live chat simulation (3 messages)
- "This is how your bot will respond"

### 7.2 Personality Selection (Simplified)
Instead of 5 scope options:
- **Professional:** "I handle your business with precision"
- **Friendly:** "Your helpful companion"
- **Hustler:** "Fast, direct, gets things done"

### 7.3 Transparent Deployment
- Real-time progress bar
- Each step explained:
  - "Creating your Telegram bot..."
  - "Configuring responses..."
  - "Generating auth code..."
- Estimated time remaining
- Fallback: "If this takes >5 min, contact support"

### 7.4 Payment Flow
- **Primary:** Stripe (cards)
- **Secondary:** Crypto via NowPayments
- **Trial:** 7 days free, no card required
- Clear pricing: "$99/month or $999/year (2 months free)"

### 7.5 Error Recovery
| Error | Handling |
|-------|----------|
| Devin fails | Fallback to manual bot creation guide |
| Payment fails | Retry with different method |
| Telegram API down | Queue deployment, notify when ready |
| User loses auth code | Regenerate from dashboard |

---

## 8. UI/UX Improvements

### 8.1 Wizard Redesign

**Current Issues:**
- Too many steps
- No visual progress
- Unclear what's next

**V2 Design:**
```
┌─────────────────────────────────────────┐
│  ●────●────●────○────○     3 of 5      │  <- Progress
├─────────────────────────────────────────┤
│                                         │
│  What's your style?                     │  <- Clear question
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ 💼       │  │ 🤝       │            │  <- Visual cards
│  │Professional│ Friendly  │            │
│  │          │  │          │            │
│  │"I'll     │  │"Hey!     │            │  <- Sample response
│  │handle..."│  │How can...│            │
│  └──────────┘  └──────────┘            │
│                                         │
│  [    Continue    ]                     │  <- Clear CTA
│                                         │
└─────────────────────────────────────────┘
```

### 8.2 Mobile-First
- Touch-friendly cards (min 44px)
- Bottom sheet for options
- Swipe between steps
- One-handed operation

### 8.3 AI Orb Improvements
- Reacts to each step (happy, thinking, excited)
- Shows helpful tips on hover
- Celebrates completion

---

## 9. Analytics & Monitoring

### 9.1 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Time to first value (preview) | <30s | N/A |
| Conversion rate (visit → pay) | >15% | Unknown |
| Drop-off at auth step | <20% | ~40% |
| Deployment success rate | >95% | ~50% |
| User satisfaction (NPS) | >50 | Unknown |

### 9.2 Event Tracking

```typescript
// Key events to track
wizard_started
preview_generated      // NEW
personality_selected   // NEW
demo_chat_used         // NEW
auth_completed
payment_initiated
payment_completed
deployment_started
deployment_completed
deployment_failed
bot_activated
```

### 9.3 Real-time Alerts
- Deployment fails >3 times in 1 hour
- Payment success rate drops <80%
- User stuck on step >5 minutes
- Devin API errors

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Delete dead code (6,000+ lines)
- [ ] Restructure directories
- [ ] Update database schema
- [ ] Set up Stripe account
- [ ] Configure PostHog

### Phase 2: Core Flow (Week 2)
- [ ] Build new wizard (Steps 1-3)
- [ ] Implement preview generation
- [ ] Integrate Stripe payments
- [ ] Update Devin integration

### Phase 3: Polish (Week 3)
- [ ] Step 4-6 completion
- [ ] Mobile optimization
- [ ] Error handling
- [ ] Analytics integration

### Phase 4: Launch (Week 4)
- [ ] Beta testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production release

---

## 11. Success Criteria

### Quantitative
- [ ] Conversion rate >15% (visit to paid)
- [ ] Time to deploy <3 minutes
- [ ] Deployment success rate >95%
- [ ] Support tickets <5/week

### Qualitative
- [ ] Users understand what they're buying
- [ ] No "is it working?" confusion
- [ ] Clear value proposition
- [ ] Delightful experience

---

## 12. Additional Services Required

### Immediate (Phase 1)
| Service | Cost | Purpose |
|---------|------|---------|
| Stripe | 2.9% + $0.30/tx | Primary payments |
| PostHog | Free tier | Analytics |
| OpenAI API | ~$0.01/preview | Preview generation |
| LogSnag | Free tier | Notifications |

### Future (Phase 2+)
| Service | Purpose |
|---------|---------|
| Crisp/Intercom | Live chat support |
| Customer.io | Email automation |
| Sentry | Error tracking |
| Datadog | Infrastructure monitoring |

---

## 13. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Devin API unreliable | Build manual fallback guide |
| Stripe rejected (crypto) | Keep NowPayments as backup |
| Users don't convert | A/B test preview step |
| Telegram API changes | Abstract bot creation layer |
| High server costs | Implement rate limiting |

---

## Appendix: Code Cleanup Checklist

### Delete Files
- [ ] 18 unused components
- [ ] 12 unused API routes  
- [ ] `lib/provisioning/` folder
- [ ] `services/` folder
- [ ] `lib/walletPool.ts`
- [ ] `lib/crypto-payment.ts`

### Consolidate
- [ ] Merge 3 deploy endpoints into 1
- [ ] Single admin auth middleware
- [ ] One payment service

### Rename
- [ ] `deploy-and-notify` → `deploy`
- [ ] `api/agents` → `api/v2/agents`

### Security
- [ ] Remove hardcoded admin tokens
- [ ] Remove mock database fallback
- [ ] Add rate limiting
- [ ] Validate all inputs

---

**Document Owner:** Mark  
**Version:** 2.0  
**Last Updated:** 2026-02-07  
**Status:** Draft for Review
