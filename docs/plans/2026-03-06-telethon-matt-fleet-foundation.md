# Telethon + Matt + Internal Fleet Foundation

Date: March 6, 2026

## What this change introduces

- explicit agent ownership and role modeling
- per-customer `Matt Account Manager` and `Matt Support` assignments
- internal fleet primitives for tasks, runs, memberships, and support tickets
- Telethon runner scaffold as a standalone Telegram transport
- dedicated Cortex profiles for support, account management, internal ops, and swarm workers

## New domain layers

1. Customer agents
2. Matt relationships
3. Internal fleet

## Repo surfaces

- `prisma/schema.prisma`
- `lib/agent-blueprint.ts`
- `lib/matt-relationships.ts`
- `app/api/internal/matt/relationships/route.ts`
- `app/api/internal/fleet/route.ts`
- `app/api/internal/fleet/tasks/route.ts`
- `app/api/internal/telethon/*`
- `services/telethon-runner/`

## What still depends on external infrastructure

- Telethon API credentials
- Redis / queue execution for live fleet scheduling
- Cortex gateway hosting and agent provider baseUrl wiring
- real Telegram user/account mapping
- production deployment of the Telethon runner
