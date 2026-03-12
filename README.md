# Meet Matt

AI agent deployment platform. Create and deploy customer assistants, synthetic employees, and internal Matt operators with bundle-based capabilities, paid with card via Dodo Payments or cryptocurrency via NowPayments.

## Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router, monolith)
- **Auth**: Privy (email, social, embedded wallets)
- **Database**: PostgreSQL + Prisma
- **Payments**: Dodo Payments (cards, optionally routed through Sesh) + NowPayments (USDT, USDC, and other crypto)
- **Agent Deployment**: Devin AI + OpenClaw/REALLYopenClaw
- **Capability Commerce**: use-case templates, catalog items, entitlements, loadouts, usage ledger
- **Deployment**: Vercel at meetmatt.xyz

## Production Split

- **Vercel**: public app, auth, billing flows, ops console, internal HTTP APIs
- **Neon/Postgres**: system of record
- **Cortex gateway**: standalone worker service in `services/cortex/`
- **Telethon runner**: standalone persistent worker in `services/telethon-runner/`
- **Customer runtime**: Devin today, OpenClaw/worker fleet over time

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in env vars (see below)
npm run dev
```

Standalone worker services:

```bash
npm run start:cortex
cd services/telethon-runner && uvicorn main:app --host 127.0.0.1 --port 8787
```

Workspace rollout after pushing the Prisma schema:

```bash
npx prisma db push
npm run backfill:workspaces -- --dry-run
npm run backfill:workspaces
```

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID |
| `PRIVY_APP_SECRET` | Privy server secret |
| `NOWPAYMENTS_API_KEY` | NowPayments API key |
| `NOWPAYMENTS_IPN_SECRET` | NowPayments IPN webhook secret |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Dodo webhook signing secret |
| `SESH_BASE_URL` | Base URL for the Sesh integration gateway |
| `SESH_ADMIN_KEY` | Admin key used to provision workspace temples and invoke provider actions |
| `MEETMATT_SESH_WEBHOOK_SECRET` | Shared HMAC secret used to verify Sesh-delivered WhatsApp fallback webhooks |
| `COMPOSIO_API_KEY` | Composio API key used as Matt's primary connector/tool plane |
| `COMPOSIO_BASE_URL` | Optional Composio API base URL override; defaults to `https://backend.composio.dev` |
| `DEVIN_API_KEY` | Devin AI API key |
| `DEVIN_WEBHOOK_SECRET` | Devin webhook verification secret |
| `ADMIN_AUTH_TOKEN` | Admin API bearer token |
| `INTERNAL_WEBHOOK_SECRET` | Internal service-to-service secret |
| `MEETMATT_SECRET_ENCRYPTION_KEY` | 32-byte base64 or 64-char hex key used to encrypt Telegram bot/session secrets at rest |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. https://meetmatt.xyz) |
| `CORTEX_GATEWAY_URL` | Base URL for the standalone Cortex gateway |

### Worker / Gateway Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI key for Cortex |
| `GOOGLE_API_KEY` | Google key for Cortex |
| `DEEPSEEK_API_KEY` | DeepSeek key for Cortex |
| `ANTHROPIC_API_KEY` | Anthropic key for Cortex |
| `UPSTASH_REDIS_REST_URL` | Redis URL for Cortex budget tracking |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token for Cortex budget tracking |
| `MEETMATT_INTERNAL_SECRET` | Shared secret used by Telethon and internal workers |
| `TELETHON_API_ID` | Telegram API ID |
| `TELETHON_API_HASH` | Telegram API hash |
| `TELETHON_BOT_TOKEN` | Optional static bot token for first runner bootstrap |
| `TELETHON_SESSION_STRING` | Optional Telethon user session |

### Optional Payment Variables

| Variable | Description |
|---|---|
| `DODO_PAYMENTS_API_BASE_URL` | Override Dodo API base URL; use `https://test.dodopayments.com` for test mode |
| `DODO_PAYMENTS_MATT_PRODUCT_ID` | Dodo product ID for the base Matt subscription checkout |

### Optional Runtime/Queue Variables

| Variable | Description |
|---|---|
| `MEETMATT_DEPLOY_PROVIDER` | Force provider: `devin` or `openclaw` |
| `OPENCLAW_RUNNER_URL` | Remote OpenClaw runner base URL |
| `OPENCLAW_RUNNER_TOKEN` | Runner auth token |
| `DEPLOY_JOBS_ENABLED` | Enable async deploy queue (`true`/`false`) |
| `DEPLOY_JOBS_MAX_ATTEMPTS` | Max retries per queued deploy job |
| `DEPLOY_JOBS_BACKOFF_BASE_SECONDS` | Exponential backoff base |
| `DEPLOY_JOBS_CRON_LIMIT` | Jobs processed per cron run |

## Migration Scripts

| Command | Description |
|---|---|
| `npm run backfill:workspaces -- --dry-run` | Preview workspace ownership updates after schema push |
| `npm run backfill:workspaces` | Backfill personal/default workspaces and `workspaceId` ownership |

## API Routes

All routes require Bearer token auth unless noted.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/agents` | GET | Bearer | List user's agents |
| `/api/agents` | POST | Bearer | Create new agent |
| `/api/agents` | PATCH | Bearer/Internal | Update agent |
| `/api/agents/status` | GET | Bearer | Get agent status |
| `/api/agents/trigger-deploy` | POST | Bearer/Internal | Trigger deployment (sync or queued) |
| `/api/payment/create` | POST | Bearer | Create Dodo card checkout or NowPayments crypto invoice |
| `/api/payment/status` | GET | Bearer | Check payment status |
| `/api/verify` | POST | Bearer | Verify agent auth code |
| `/api/user/me` | GET | Bearer | Get user profile + agents |
| `/api/admin/users` | GET | Admin token | List all users (admin only) |
| `/api/webhooks/payment` | POST | IPN signature | NowPayments IPN webhook |
| `/api/webhooks/dodo` | POST | Standard Webhooks signature | Dodo Payments webhook |
| `/api/webhooks/devin` | POST | Webhook secret | Devin completion webhook |
| `/api/internal/deploy-jobs/process` | GET/POST | Internal/Cron secret | Process queued deploy jobs |
| `/api/internal/openclaw/health` | GET | Internal/Cron secret | Runtime health probe |
| `/api/internal/openclaw/capacity` | GET | Internal/Cron secret | Runtime capacity + admission state |
| `/api/internal/use-cases` | GET/POST | Admin/Internal | Sync and list built-in use-case templates |
| `/api/internal/use-cases/:slug/provision` | POST | Admin/Internal | Provision a template onto an agent |
| `/api/internal/catalog/items` | GET | Admin/Internal | List catalog items, skills, and linked packs |
| `/api/internal/catalog/items/:slug/attach` | POST | Admin/Internal | Attach an item/add-on to an agent |
| `/api/internal/agents/:id/loadout` | GET | Admin/Internal | Inspect resolved agent loadout + entitlements |
| `/api/internal/skills/resolve` | POST | Admin/Internal | Resolve or reserve an implementation for a skill |
| `/api/internal/usage/record` | POST | Admin/Internal | Finalize usage ledger + decision log entries |
| `/api/internal/entitlements/:scope/:ownerId` | GET | Admin/Internal | Inspect active grants/allowances for an agent or workspace |
| `/api/cron/process-deploy-jobs` | GET | Cron secret | Scheduled deploy job processor |

## Documentation

- [AGENTS.md](AGENTS.md) — Agent system architecture
- [docs/plans/2026-03-06-agent-capability-commerce-architecture-v2.md](docs/plans/2026-03-06-agent-capability-commerce-architecture-v2.md) — Buildable capability-commerce architecture
- [docs/plans/2026-03-06-agent-capability-commerce-product-brief-v2.md](docs/plans/2026-03-06-agent-capability-commerce-product-brief-v2.md) — Product strategy / packaging brief
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [DEVIN_INTEGRATION.md](DEVIN_INTEGRATION.md) — Devin AI setup
- [ENV_SETUP.md](ENV_SETUP.md) — Environment variables guide
- [services/cortex/README.md](services/cortex/README.md) — Cortex worker deployment
- [services/telethon-runner/README.md](services/telethon-runner/README.md) — Telethon worker deployment
