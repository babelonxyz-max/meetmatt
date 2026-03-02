# Meet Matt

AI agent deployment platform. Create and deploy custom Telegram bots powered by Devin AI, paid with cryptocurrency via NowPayments.

## Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router, monolith)
- **Auth**: Privy (email, social, embedded wallets)
- **Database**: PostgreSQL + Prisma
- **Payments**: NowPayments (USDT, USDC, and other crypto)
- **Agent Deployment**: Devin AI
- **Deployment**: Vercel at meetmatt.xyz

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in env vars (see below)
npm run dev
```

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID |
| `PRIVY_APP_SECRET` | Privy server secret |
| `NOWPAYMENTS_API_KEY` | NowPayments API key |
| `NOWPAYMENTS_IPN_SECRET` | NowPayments IPN webhook secret |
| `DEVIN_API_KEY` | Devin AI API key |
| `DEVIN_WEBHOOK_SECRET` | Devin webhook verification secret |
| `ADMIN_AUTH_TOKEN` | Admin API bearer token |
| `INTERNAL_WEBHOOK_SECRET` | Internal service-to-service secret |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. https://meetmatt.xyz) |

## API Routes

All routes require Bearer token auth unless noted.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/agents` | GET | Bearer | List user's agents |
| `/api/agents` | POST | Bearer | Create new agent |
| `/api/agents` | PATCH | Bearer/Internal | Update agent |
| `/api/agents/status` | GET | Bearer | Get agent status |
| `/api/agents/trigger-deploy` | POST | Bearer/Internal | Trigger Devin deployment |
| `/api/payment/create` | POST | Bearer | Create NowPayments payment |
| `/api/payment/status` | GET | Bearer | Check payment status |
| `/api/verify` | POST | Bearer | Verify agent auth code |
| `/api/user/me` | GET | Bearer | Get user profile + agents |
| `/api/admin/users` | GET | Admin token | List all users (admin only) |
| `/api/webhooks/payment` | POST | IPN signature | NowPayments IPN webhook |
| `/api/webhooks/devin` | POST | Webhook secret | Devin completion webhook |

## Documentation

- [AGENTS.md](AGENTS.md) — Agent system architecture
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [DEVIN_INTEGRATION.md](DEVIN_INTEGRATION.md) — Devin AI setup
- [ENV_SETUP.md](ENV_SETUP.md) — Environment variables guide
