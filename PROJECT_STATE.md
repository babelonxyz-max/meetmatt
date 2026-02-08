# MeetMatt V2 - Project State Document

> **Last Updated:** 2026-02-07  
> **Current Branch:** `ralph-improvements`  
> **Status:** Build Successful ✅

---

## 📋 Quick Summary

MeetMatt V2 is an AI agent deployment platform. Users create a bot via a 5-step wizard, pay with crypto, and get a deployed AI agent powered by Devin.

**Philosophy:** "See First, Pay Last" - Demo before payment to reduce user anxiety.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│   PostgreSQL    │────▶│   Devin API     │
│   (Frontend)    │     │   (Neon/Prisma) │     │   (Bot Creation)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                          ┌─────────────────┐
│   Privy Auth    │                          │  NowPayments    │
│   (Web3 Auth)   │                          │  (Crypto)       │
└─────────────────┘                          └─────────────────┘
```

**Stack:**
- **Framework:** Next.js 16.1.6 + Turbopack + TypeScript
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Auth:** Privy (Web3 wallet auth)
- **Payments:** NowPayments (crypto only - Stripe removed)
- **AI:** Devin API for bot creation/deployment
- **Deployment:** Vercel

---

## 🌿 Branch Status

| Branch | Status | Description |
|--------|--------|-------------|
| `main` | Stable | Production-ready V2 (without Ralph improvements) |
| `ralph-improvements` | ✅ Ready | Main + security/validation/error handling improvements |

**Commits ahead of main:** 4 (the Ralph loops)

### To Merge:
```bash
git checkout main
git merge ralph-improvements
git push origin main
```

---

## 📁 Project Structure

```
meetmatt/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── agents/route.ts       # CRUD agents (V2 flow)
│   │   ├── payments/route.ts     # Create payment intents
│   │   ├── webhooks/
│   │   │   ├── payment/route.ts  # NowPayments IPN handler
│   │   │   └── devin/route.ts    # Devin webhook handler
│   │   ├── health/route.ts       # Health check endpoint
│   │   └── trigger-deploy/route.ts # Devin deployment trigger
│   ├── v2/                       # V2 Wizard UI
│   │   ├── page.tsx              # Main wizard page
│   │   └── layout.tsx            # Wizard layout
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React Components
│   ├── v2-wizard.tsx             # 5-step wizard component
│   ├── v2-summary-modal.tsx      # Agent preview modal
│   └── ...
├── lib/                          # Utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── errors.ts                 # Custom error classes ⭐ NEW
│   ├── api-middleware.ts         # Middleware utilities ⭐ NEW
│   └── sanitize.ts               # Input sanitization ⭐ NEW
├── prisma/
│   └── schema.prisma             # Database schema
├── public/                       # Static assets
├── PROJECT_STATE.md              # This file
└── package.json
```

---

## 🛡️ Ralph Improvements (Completed)

### Loop 1: API Validation
- ✅ Zod schemas for request validation
- ✅ Rate limiting (10 req/min per IP)
- ✅ Request ID tracking for debugging
- ✅ Structured error responses

### Loop 2: Webhook Security
- ✅ HMAC signature verification for NowPayments
- ✅ Idempotency check (prevents duplicate payments)
- ✅ Retry logic with exponential backoff
- ✅ Comprehensive webhook logging

### Loop 3: Error Handling
- ✅ Custom `AppError` class with metadata
- ✅ `tryCatch` wrapper for async functions
- ✅ Centralized error codes (VALIDATION_ERROR, RATE_LIMITED, etc.)
- ✅ Health check endpoint (`/api/health`)

### Loop 4: Input Sanitization
- ✅ `sanitizeHtml()` - Removes dangerous tags
- ✅ `sanitizeSlug()` - URL-safe slugs
- ✅ Rate limiting utilities
- ✅ XSS prevention

---

## 🔐 Environment Variables

### Required for Production:
```bash
# Database
DATABASE_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://..."  # For Neon

# Auth (Privy)
NEXT_PUBLIC_PRIVY_APP_ID="cl..."
PRIVY_APP_SECRET="..."

# AI (Devin)
DEVIN_API_KEY="..."           # ⚠️ Currently placeholder
DEVIN_WEBHOOK_SECRET="..."    # For webhook verification

# Payments (NowPayments)
NOWPAYMENTS_API_KEY="..."
NOWPAYMENTS_IPN_SECRET="..."  # For webhook signature verification

# App
NEXT_PUBLIC_APP_URL="https://meetmatt.app"
```

### Checklist:
- [ ] `DEVIN_API_KEY` - Need real key from Devin dashboard
- [ ] `NOWPAYMENTS_IPN_SECRET` - Verify in NowPayments settings
- [ ] `PRIVY_APP_SECRET` - Ensure it's set in Vercel

---

## 🎯 Key Files Reference

### API Routes

| Route | Purpose | Key Features |
|-------|---------|--------------|
| `POST /api/agents` | Create agent | Validation, user upsert, Devin trigger |
| `POST /api/payments` | Create payment | NowPayments integration |
| `POST /api/webhooks/payment` | Payment IPN | HMAC verification, idempotency |
| `POST /api/webhooks/devin` | Devin updates | Session tracking, status updates |
| `GET /api/health` | Health check | DB + env validation |

### Utilities

| File | Purpose |
|------|---------|
| `lib/errors.ts` | `AppError` class, error codes, `tryCatch` wrapper |
| `lib/sanitize.ts` | Input sanitization, rate limiting |
| `lib/api-middleware.ts` | Middleware composition utilities |
| `lib/prisma.ts` | Database client singleton |

---

## 🧪 Testing Checklist

### Before Production:
- [ ] **Payment Flow:** End-to-end crypto payment test
- [ ] **Devin Integration:** Real API key + session creation test
- [ ] **Webhook Security:** Verify IPN signature verification works
- [ ] **Rate Limiting:** Confirm 10 req/min limit works
- [ ] **Error Handling:** Trigger errors, verify responses
- [ ] **Health Check:** `/api/health` returns healthy

### ODONATUM (Special User):
- **Privy ID:** `cmlbr0nx403wzl40d6s7p3du6`
- **Telegram:** 143314281
- **Status:** Already paid, handled separately
- **Action:** Ensure deployment works for this user

---

## 🚨 Known Issues

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Devin API Key | 🔴 High | Pending | Placeholder in env, need real key |
| Vercel Deploy Limit | 🟡 Medium | Watch | Hit 100/day limit earlier |
| IPN Testing | 🟡 Medium | Pending | Needs production test |
| | | | |

---

## 🚀 Deployment Status

### Current:
- **Branch:** `ralph-improvements`
- **Build:** ✅ Success (20 API routes, 7 components)
- **Preview URL:** (Check Vercel dashboard)

### To Deploy to Production:
```bash
# 1. Merge to main
git checkout main
git merge ralph-improvements

# 2. Push (triggers Vercel deploy)
git push origin main

# 3. Monitor Vercel dashboard for build status
```

### Vercel Limits:
- **Current:** Watch for 100 deployments/day limit
- **Workaround:** Use `vercel --prod` only when ready

---

## 📝 Database Schema (Prisma)

### Key Models:
```prisma
model User {
  id          String   @id @default(uuid())
  privyId     String   @unique
  email       String?
  createdAt   DateTime @default(now())
  agents      Agent[]
  payments    Payment[]
}

model Agent {
  id               String   @id @default(uuid())
  sessionId        String   @unique
  slug             String   @unique
  name             String
  purpose          String
  status           String   // pending, deploying, active, failed
  activationStatus String   // activating, active, inactive
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  payments         Payment[]
}

model Payment {
  id           String   @id @default(uuid())
  agentId      String
  agent        Agent    @relation(fields: [agentId], references: [id])
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  amount       Float
  currency     String
  status       String   // pending, confirmed, failed
  confirmedAt  DateTime?
  nowpaymentsId String?
}

model PaymentWebhookLog {
  id         String   @id @default(uuid())
  paymentId  String   @unique
  status     String   // processed, failed
  payload    Json
  createdAt  DateTime @default(now())
}
```

---

## 🎨 V2 Wizard Flow

```
Step 1: Name Your Agent
    ↓
Step 2: Choose Personality
    ↓
Step 3: DEMO (See bot in action) ← "See First"
    ↓
Step 4: Payment (Crypto)
    ↓
Step 5: Deploy ← "Pay Last"
```

**User sees a working demo BEFORE paying** - this is the core V2 improvement.

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes
npx prisma studio        # Open Prisma Studio

# Build
npm run build            # Production build

# Git
git status               # Check current branch
git log --oneline -10    # Recent commits
```

---

## 📞 Contact & Context

### Project Constraints:
- ✅ **NO visual changes** - Backend/logic only
- ✅ **NO main branch pushes** - Use `ralph-improvements`
- ✅ **Crypto only** - Stripe removed, NowPayments only
- ✅ **ODONATUM handled separately** - Special user already paid

### Next Steps (Choose One):
1. **Merge to main** - Deploy Ralph improvements to production
2. **More Ralph loops** - Continue security/performance improvements
3. **Test production** - End-to-end payment + deployment test
4. **Fix Devin key** - Get real API key and test integration

---

## 🗂️ Related Files

- `README.md` - General project readme
- `prisma/schema.prisma` - Database schema
- `.env.local` - Environment variables (not committed)
- `package.json` - Dependencies and scripts

---

## 🤖 For Next AI Session

When continuing this project:

1. **Read this file first** (`PROJECT_STATE.md`)
2. **Check current branch:** `git branch`
3. **Check environment:** `cat .env.local | grep -v "^#" | grep -v "^$"`
4. **Check build:** `npm run build`
5. **Check health:** `curl /api/health` (if running)

### Quick Start Commands:
```bash
cd /Users/mark/meetmatt
git status                    # Check branch
npm run dev                   # Start dev
```

---

*Document maintained by AI. Last session: Ralph improvements (Loops 1-4).*
