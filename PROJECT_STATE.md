# MeetMatt Project State
**Last Updated:** 2026-03-02
**Branch:** main
**Deployment:** https://meetmatt.xyz (Vercel)
**Repo:** https://github.com/babelonxyz-max/meetmatt

---

## Architecture

Next.js 16 monolith (App Router), deployed on Vercel. No microservices.

- **Auth**: Privy (email, social, embedded wallets) — server-side verification via `verifyAuthToken()`
- **Database**: PostgreSQL + Prisma 7.3
- **Payments**: NowPayments (USDT, USDC, and other crypto via IPN webhooks)
- **Agent Deployment**: Devin AI (creates Telegram bots)
- **UI**: Tailwind 4, Framer Motion, Lucide icons, Tone.js (audio feedback)

---

## What's Working

### Core Flow
- [x] Home page with NexusOrb + 5-step wizard (Name → Personality → Demo → Payment → Deploy)
- [x] Privy authentication
- [x] Agent creation with pending status (deployment triggers from payment webhook)
- [x] NowPayments crypto payment (USDT/USDC on multiple networks)
- [x] IPN webhook with HMAC-SHA512 signature verification
- [x] Devin AI deployment triggered on payment confirmation
- [x] Devin webhook parses bot username, auth code, telegram link
- [x] Dashboard with agent status, verification flow, billing summary
- [x] Billing page (shell — plan switching/notifications marked Coming Soon)
- [x] Terms, Privacy, Pricing pages

### Security (cleaned 2026-03-02)
- [x] All user-facing API routes require Bearer token auth via `lib/auth.ts`
- [x] Admin route requires `ADMIN_AUTH_TOKEN` env var (no hardcoded fallback)
- [x] NowPayments IPN signature verification (real HMAC-SHA512)
- [x] Internal webhook-to-webhook calls use `INTERNAL_WEBHOOK_SECRET`
- [x] Privy token verification uses `verifyAuthToken()` (not `getUser()`)
- [x] No secrets in git (dev.db deleted, .gitignore covers *.db and logs/)

---

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/agents` | GET | Bearer | List user's agents |
| `/api/agents` | POST | Bearer | Create new agent (pending status) |
| `/api/agents` | PATCH | Bearer/Internal | Update agent fields |
| `/api/agents/status` | GET | Bearer | Get agent deployment status |
| `/api/agents/trigger-deploy` | POST | Bearer/Internal | Trigger Devin deployment |
| `/api/payment/create` | POST | Bearer | Create NowPayments payment |
| `/api/payment/nowpayments` | POST/GET | None (API proxy) | Proxy to NowPayments API |
| `/api/payment/status` | GET | Bearer | Check payment status |
| `/api/verify` | POST | Bearer | Verify agent auth code |
| `/api/user/me` | GET | Bearer | Get user profile + agents + payments |
| `/api/admin/users` | GET | Admin token | List all users (admin only) |
| `/api/webhooks/payment` | POST | IPN signature | NowPayments IPN webhook |
| `/api/webhooks/devin` | POST | Webhook secret | Devin completion webhook |

---

## Environment Variables (Vercel)

### Set ✅
- `DATABASE_URL` — PostgreSQL connection
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID
- `PRIVY_APP_SECRET` — Privy server secret
- `NOWPAYMENTS_API_KEY` — NowPayments API key
- `NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY` — NowPayments public key
- `NOWPAYMENTS_IPN_SECRET` — IPN webhook verification
- `DEVIN_API_KEY` — Devin AI API key
- `ADMIN_AUTH_TOKEN` — Admin API bearer token (rotated 2026-03-02)
- `INTERNAL_WEBHOOK_SECRET` — Service-to-service auth (added 2026-03-02)

### Still Needed
- [ ] `DEVIN_WEBHOOK_SECRET` — Devin webhook verification
- [ ] `NEXT_PUBLIC_APP_URL` — Public URL (https://meetmatt.xyz)

---

## Database Models

| Model | Purpose |
|---|---|
| `User` | Privy-integrated user accounts |
| `Agent` | AI agents with deployment/subscription tracking |
| `Payment` | Payment transaction records |

**Removed (2026-03-02):** WalletPool (unused), User.stripeCustomerId (Stripe removed)

---

## Pricing

- $150/month per agent (first month includes setup)
- $1000/year (annual plan — marked Coming Soon in billing UI)
- Payment via USDT, USDC on TRC20, ERC20, BSC, Solana, Base, Arbitrum

---

## Production Cleanup (2026-03-02)

### Deleted
- 30+ dead files: AIOrb, LoginButton, session.ts, tracking.ts, docker-compose, nginx.conf, dev.db, 8 stale docs, shared/ directory, control panel (API + pages), fleet API, infrastructure provisioner, settings page
- 7 dead API routes: auth/verify, payment/usdh, user/dashboard, user/subscribe, fleet/*, control/*, infrastructure/*
- 11 unused packages: stripe, ethers, viem, axios, bcryptjs, uuid, @neondatabase/serverless, @prisma/adapter-neon

### Fixed
- Hardcoded admin token removed
- NowPayments IPN verification implemented (was a no-op)
- All routes behind auth (were wide open)
- Privy getUser→verifyAuthToken
- Payment flow: agent created before payment, deploy triggers from webhook only
- Regex escape bug in Devin webhook
- Pricing inconsistency ($99→$150)
- Terms jurisdiction placeholder
- Dashboard hardcoded "Pro" plan and fake dates
- Billing page fake USDH card and hardcoded date
- USDH payment option removed (broken flow)

---

## Backlog

### High Priority
1. [ ] Set `DEVIN_WEBHOOK_SECRET` and `NEXT_PUBLIC_APP_URL` in Vercel
2. [ ] Test full payment→deployment flow end-to-end in production
3. [ ] Run Prisma migration to drop WalletPool table and stripeCustomerId column
4. [ ] Test real Devin API deployment (currently falls back to template)

### Medium Priority
5. [ ] Add rate limiting to unauthenticated `/api/payment/nowpayments` proxy
6. [ ] Add email notifications (Resend) for payment confirmations and deployment completions
7. [ ] Wire up billing page plan switching (currently Coming Soon)
8. [ ] Add proper error pages (currently generic 404)

### Low Priority
9. [ ] Fix pre-existing lint errors (41 `no-explicit-any`, `set-state-in-effect`)
10. [ ] Add monitoring/logging (Sentry or similar)
11. [ ] Add analytics
12. [ ] Consider annual plan implementation

---

## Deployment

```bash
# Build locally
npm run build

# Deploy (auto on push to main)
git push origin main

# Manual deploy
npx vercel --prod

# Database
npx prisma generate
npx prisma db push
npx prisma studio
```

---

## URLs

| URL | Purpose |
|---|---|
| https://meetmatt.xyz | Main site + wizard |
| https://meetmatt.xyz/dashboard | User dashboard |
| https://meetmatt.xyz/billing | Billing & settings |
| https://meetmatt.xyz/pricing | Pricing page |
| https://meetmatt.xyz/terms | Terms of service |
| https://meetmatt.xyz/privacy | Privacy policy |
