# Cortex Gateway Service

This is the standalone inference gateway for MeetMatt.

## Role

- receives OpenAI-compatible chat requests
- routes them across provider/model tiers
- applies budget controls
- records inference logs
- optionally finalizes capability-usage metering

This service should not run on Vercel.

## Local Run

From the repo root:

```bash
npm install
cp services/cortex/.env.example .env.cortex
# fill in the required values
set -a
source .env.cortex
set +a
npm run start:cortex
```

Health endpoints:

- `GET /health`
- `GET /status`

## Container Build

Build from the repo root so the gateway can access the shared `lib/` and `prisma/` folders:

```bash
docker build -f services/cortex/Dockerfile -t meetmatt-cortex .
docker run --env-file .env.cortex -p 8200:8200 meetmatt-cortex
```

## Production Placement

Recommended production placement:

- Contabo VM for cheap persistent compute
- private/internal endpoint if possible
- public exposure only behind strict network controls

Required env:

- `DATABASE_URL`
- provider API keys for the models you enable
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
