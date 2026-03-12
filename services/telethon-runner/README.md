# Telethon Runner

This service is the optional Telegram transport layer for MeetMatt's Telethon-backed identities:

- `Matt Support`
- `Matt Account Manager`
- internal support / ops user agents
- future beta `synthetic employees`

It is intentionally separate from the Next.js app. Telethon needs a long-lived
process and durable session state, which does not belong inside Vercel request
handlers.

## Scope

The runner does four things:

1. maintains one or more Telegram connections via Telethon
2. forwards inbound Telegram messages to MeetMatt's `/api/internal/telethon/inbound`
3. polls MeetMatt for outbound transport work and sends it through the correct identity
4. exposes a small local HTTP API for send/health operations

The runner does **not** own business logic, billing, task routing, or Cortex.
Those stay in the MeetMatt app.

## Environment

Copy `.env.example` and set:

- `TELETHON_API_ID`
- `TELETHON_API_HASH`
- `MEETMATT_API_BASE_URL`
- `MEETMATT_INTERNAL_SECRET`

Optional static identity for local smoke testing:

- `TELETHON_BOT_TOKEN`
- `TELETHON_SESSION_STRING`

Optional local-dev fallback:

- `TELETHON_DEFAULT_USER_ID`

That lets a static env-backed identity map inbound Telegram messages to one
known user when you are not yet using provisioned `TelegramIdentity` records.

## Run

```bash
cd services/telethon-runner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8787
```

## MeetMatt API Contracts

Inbound messages are sent to:

- `POST /api/internal/telethon/inbound`

Outbound work is polled from:

- `GET /api/internal/telethon/outbound`

Delivery acknowledgements are posted to:

- `POST /api/internal/telethon/outbound/ack`

Identity state is loaded from:

- `GET /api/internal/telethon/identities?includeInactive=true&includeSecrets=true`

Heartbeats are recorded through:

- `POST /api/internal/telethon/heartbeat`

Health is checked through:

- `GET /api/internal/telethon/health`

## Production Notes

- store Telethon sessions securely
- run this on a persistent worker, not Vercel
- prefer provisioned `TelegramIdentity` + `TelegramThreadBinding` records over fallback user mapping
- this runner is an extra transport layer, not the default customer bot runtime
