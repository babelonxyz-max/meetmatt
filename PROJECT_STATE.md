# MeetMatt Project State
**Last Updated:** 2026-03-03
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

### Security (hardened 2026-03-02, audit-prepped 2026-03-03)
- [x] All user-facing API routes require Bearer token auth via `lib/auth.ts`
- [x] Admin route requires `ADMIN_AUTH_TOKEN` env var (no hardcoded fallback)
- [x] NowPayments IPN signature verification (real HMAC-SHA512, timing-safe)
- [x] Internal webhook-to-webhook calls use `INTERNAL_WEBHOOK_SECRET`
- [x] Privy token verification uses `verifyAuthToken()` (not `getUser()`)
- [x] No secrets in git (dev.db deleted, .gitignore covers *.db and logs/)
- [x] All secret comparisons use `safeCompare()` (SHA-256 + `timingSafeEqual`)
- [x] NowPayments proxy requires auth + validates price against known tiers
- [x] PATCH mass assignment blocked — users can only update `telegramUserId`
- [x] `authCode` never leaked in GET responses (removed from /user/me and /agents/status)
- [x] Webhook replay protection (idempotency checks on payment + devin webhooks)
- [x] Payment webhook extracts agentId from order_id (no race condition)
- [x] Internal secret fails closed when env var missing
- [x] Rate limiting on /api/verify (5 req/min per IP, best-effort in-memory)
- [x] Input sanitization on agent creation (sanitizeAgentName + sanitizeText)
- [x] Agent GET uses select clause (excludes authCode, sessionId, devinSessionId)
- [x] Error responses return generic "Internal server error" for 500s (no message leaks)
- [x] Security headers via middleware.ts (HSTS, X-Frame-Options, nosniff, XSS-Protection, Referrer-Policy, Permissions-Policy)
- [x] CORS fallback is `https://meetmatt.xyz` (not wildcard `*`)
- [x] Dashboard verify call includes Authorization header (was missing before)

---

## Security Hardening (2026-03-03) — Pre-Audit

### New Files
- `lib/crypto-utils.ts` — `safeCompare()` utility (SHA-256 hash + timingSafeEqual)
- `middleware.ts` — Next.js security headers (HSTS, X-Frame-Options, nosniff, etc.)

### Files Modified (14)
| File | Changes |
|---|---|
| `lib/nowpayments.ts` | Timing-safe IPN signature verification |
| `lib/api-middleware.ts` | CORS fallback → `https://meetmatt.xyz` |
| `app/api/payment/nowpayments/route.ts` | Added requireAuth + price validation + error masking |
| `app/components/PaymentModal.tsx` | Passes Bearer token on proxy calls (usePrivy) |
| `app/api/webhooks/payment/route.ts` | Idempotency + agentId from order_id + fail-closed secret + error masking |
| `app/api/webhooks/devin/route.ts` | Timing-safe + idempotency + fail-closed + error masking |
| `app/api/admin/users/route.ts` | Timing-safe admin token + error masking |
| `app/api/agents/route.ts` | Timing-safe + mass assignment whitelist + sanitization + select clause + error masking |
| `app/api/agents/trigger-deploy/route.ts` | Timing-safe + fail-closed + error masking |
| `app/api/agents/status/route.ts` | Removed authCode from response + error masking |
| `app/api/user/me/route.ts` | Removed authCode from response + error masking |
| `app/api/verify/route.ts` | Timing-safe + rate limiting (5/min) + error masking |
| `app/dashboard/page.tsx` | Added Authorization header to verify fetch |
| `app/api/payment/create/route.ts` | Error masking |

### Known Limitations (for auditor awareness)
- Rate limiter is in-memory — on Vercel serverless, each cold start gets a fresh Map (best-effort only)
- `x-forwarded-for` used for rate limiting is spoofable — need Redis/edge-config for production-grade
- 12 npm dependency vulnerabilities (2 high via transitive deps: axios prototype pollution, minimatch ReDoS)
- Payment addresses sent to third-party QR service (api.qrserver.com) — should use client-side qrcode.react
- `.env.production` with real secrets exists on local disk (not in git) — should use secrets manager
- Wallet encryption key is still placeholder value in local .env.production

---

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/agents` | GET | Bearer | List user's agents (filtered fields) |
| `/api/agents` | POST | Bearer | Create new agent (sanitized input) |
| `/api/agents` | PATCH | Bearer/Internal | Update agent (whitelisted fields per caller) |
| `/api/agents/status` | GET | Bearer | Get agent deployment status (no authCode) |
| `/api/agents/trigger-deploy` | POST | Bearer/Internal | Trigger Devin deployment |
| `/api/payment/create` | POST | Bearer | Create NowPayments payment |
| `/api/payment/nowpayments` | POST/GET | Bearer | Proxy to NowPayments API (price validated) |
| `/api/payment/status` | GET | Bearer | Check payment status |
| `/api/verify` | POST | Bearer + Rate Limited | Verify agent auth code (5 req/min) |
| `/api/user/me` | GET | Bearer | Get user profile + agents + payments (no authCode) |
| `/api/admin/users` | GET | Admin token | List all users (admin only) |
| `/api/webhooks/payment` | POST | IPN signature | NowPayments IPN (idempotent, agentId-aware) |
| `/api/webhooks/devin` | POST | Webhook secret | Devin completion (idempotent, fail-closed) |

---

## Environment Variables (Vercel)

### Set
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
5. [ ] Rotate ALL production secrets from .env.production (especially wallet key)

### Medium Priority
6. [ ] Add email notifications (Resend) for payment confirmations and deployment completions
7. [ ] Wire up billing page plan switching (currently Coming Soon)
8. [ ] Add proper error pages (currently generic 404)
9. [ ] Replace QR code service with client-side qrcode.react
10. [ ] Upgrade to Redis/edge-config rate limiting for production-grade protection

### Low Priority
11. [ ] Fix pre-existing lint errors (41 `no-explicit-any`, `set-state-in-effect`)
12. [ ] Add monitoring/logging (Sentry or similar)
13. [ ] Add analytics
14. [ ] Consider annual plan implementation
15. [ ] Run `npm audit fix` for transitive dependency vulnerabilities

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
