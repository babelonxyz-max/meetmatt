# 🚀 Fleet Mode - Scalable Agent Deployment

Fleet Mode enables MeetMatt to deploy and manage **1000s of AI agents** simultaneously using distributed queue processing and the OpenClaw runtime provider.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Fleet Mode Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   Web UI     │────▶│  API Routes  │────▶│Fleet Manager │            │
│  │  (/fleet)    │     │  (/api/fleet)│     │              │            │
│  └──────────────┘     └──────────────┘     └──────┬───────┘            │
│                                                    │                     │
│                                                    ▼                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        BullMQ Queue                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │ Deploy Job 1│  │ Deploy Job 2│  │ Deploy Job N│  ...         │   │
│  │  │ (10 agents) │  │ (10 agents) │  │ (10 agents) │             │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │   │
│  └─────────┼────────────────┼────────────────┼────────────────────┘   │
│            │                │                │                          │
│            ▼                ▼                ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Worker Pool (Concurrent)                      │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                 │   │
│  │  │Worker 1│  │Worker 2│  │Worker 3│  │Worker N│                 │   │
│  │  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘                 │   │
│  └──────┼───────────┼───────────┼───────────┼──────────────────────┘   │
│         │           │           │           │                            │
│         └───────────┴─────┬─────┴───────────┘                            │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    OpenClaw Runtime Provider                     │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Instance #1  │  │ Instance #2  │  │ Instance #N  │          │   │
│  │  │ (50 agents)  │  │ (50 agents)  │  │ (50 agents)  │          │   │
│  │  │ localhost    │  │ 192.168.1.10 │  │ 192.168.1.11 │          │   │
│  │  │ :18789       │  │ :18789       │  │ :18789       │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Features

### 🎯 Mass Deployment
- Deploy **1 to 10,000 agents** in a single fleet
- Configurable batch sizes (5, 10, 20, 50 agents per batch)
- Parallel deployment with concurrency control
- Automatic retry on failure (up to 3 attempts)

### 📊 Real-time Monitoring
- Live deployment progress tracking
- Per-agent status monitoring
- Health checks every 30 seconds
- Resource usage metrics

### 🔄 Dynamic Scaling
- Scale fleets up or down anytime
- Add agents to running fleets
- Graceful termination support

### 🏗️ Provider Architecture
- **OpenClaw**: Primary runtime provider for local/remote execution
- **Devin**: Orchestration layer for complex deployments
- **Extensible**: Easy to add Docker, Kubernetes providers

## Quick Start

### 1. Configure Environment

Add to your `.env.local`:

```bash
# OpenClaw Gateway (local or remote)
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_AUTH_TOKEN=your-auth-token

# Redis (required for queue processing)
REDIS_URL=redis://localhost:6379

# Optional: Additional OpenClaw instances
OPENCLAW_INSTANCES='[
  {"id":"remote-1","name":"Remote 1","host":"192.168.1.100","port":18789,"authToken":"token","capacity":50},
  {"id":"remote-2","name":"Remote 2","host":"192.168.1.101","port":18789,"authToken":"token","capacity":50}
]'
```

### 2. Update Database Schema

```bash
npx prisma migrate dev --name add_fleet_mode
```

### 3. Start Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. Deploy Your First Fleet

Visit `/fleet` in the UI or use the API:

```bash
# Create a fleet
curl -X POST http://localhost:3000/api/fleet \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "name": "Support Bot Fleet",
    "description": "Customer support agents",
    "config": {
      "targetAgentCount": 100,
      "batchSize": 10,
      "concurrencyLimit": 5,
      "provider": "openclaw",
      "runtimeConfig": {
        "type": "openclaw",
        "gatewayUrl": "http://localhost:18789",
        "maxAgentsPerInstance": 50
      },
      "agentTemplate": {
        "namePrefix": "support-bot",
        "personality": "professional",
        "useCase": "customer support",
        "capabilities": ["chat", "ticketing"]
      }
    }
  }'

# Response: {"fleetId": "abc123", "status": "draft", ...}

# Deploy the fleet
curl -X POST http://localhost:3000/api/fleet/abc123/deploy \
  -H "x-user-id: your-user-id"

# Check status
curl http://localhost:3000/api/fleet/abc123/status \
  -H "x-user-id: your-user-id"
```

## API Reference

### Fleet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fleet` | Create a new fleet |
| GET | `/api/fleet` | List user's fleets |
| GET | `/api/fleet/:id` | Get fleet details |
| PATCH | `/api/fleet/:id` | Update fleet |
| DELETE | `/api/fleet/:id` | Terminate fleet |
| POST | `/api/fleet/:id/deploy` | Deploy fleet |
| POST | `/api/fleet/:id/scale` | Scale fleet |
| GET | `/api/fleet/:id/status` | Get deployment status |

### Request/Response Examples

#### Create Fleet

```json
// POST /api/fleet
{
  "name": "My Bot Fleet",
  "description": "Optional description",
  "config": {
    "targetAgentCount": 100,
    "batchSize": 10,
    "concurrencyLimit": 5,
    "provider": "openclaw",
    "runtimeConfig": { ... },
    "agentTemplate": {
      "namePrefix": "bot",
      "personality": "professional",
      "useCase": "assistant",
      "capabilities": ["chat", "search"],
      "model": "qwen3-coder"
    },
    "options": {
      "autoScale": false,
      "retryFailed": true,
      "maxRetries": 3
    }
  }
}

// Response
{
  "success": true,
  "data": {
    "fleetId": "cl...",
    "status": "draft",
    "message": "Fleet created with 100 agents ready for deployment",
    "progress": {
      "total": 100,
      "completed": 0,
      "failed": 0,
      "pending": 100
    }
  }
}
```

#### Scale Fleet

```json
// POST /api/fleet/:id/scale
{
  "targetCount": 150
}

// Response
{
  "success": true,
  "data": {
    "fleetId": "cl...",
    "status": "scaling",
    "message": "Scaling to 150 agents",
    "progress": { ... }
  }
}
```

## Configuration Options

### Fleet Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targetAgentCount` | number | required | Total agents to deploy |
| `batchSize` | number | 10 | Agents per deployment batch |
| `concurrencyLimit` | number | 5 | Parallel deployment batches |
| `provider` | string | "openclaw" | Runtime provider |
| `autoScale` | boolean | false | Enable auto-scaling |
| `retryFailed` | boolean | true | Retry failed deployments |
| `maxRetries` | number | 3 | Max retry attempts |

### Agent Template

| Option | Type | Description |
|--------|------|-------------|
| `namePrefix` | string | Prefix for agent names (e.g., "bot-0001") |
| `personality` | string | professional, friendly, hustler |
| `useCase` | string | What the agent does |
| `capabilities` | string[] | Agent skills |
| `model` | string | AI model (qwen3-coder, etc.) |
| `systemPrompt` | string | Custom system prompt |

## Limits

| Resource | Limit |
|----------|-------|
| Max agents per fleet | 10,000 |
| Max fleets per user | 10 |
| Max batch size | 100 |
| Max concurrency | 100 |
| Deployment timeout | 10 minutes |
| Max retries | 3 |

## OpenClaw Integration

Fleet Mode integrates with OpenClaw for agent runtime. OpenClaw provides:

- **Local Execution**: Run agents on your machine
- **Remote Instances**: Distribute across multiple servers
- **Resource Management**: CPU/memory limits per agent
- **Health Monitoring**: Automatic recovery

### OpenClaw Instance Configuration

```typescript
interface OpenClawInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  authToken: string;
  capacity: number;  // Max agents this instance can run
  region?: string;
  tags?: string[];
}
```

### Multiple Instances

For large fleets (1000+ agents), configure multiple OpenClaw instances:

```bash
OPENCLAW_INSTANCES='[
  {"id":"instance-1","host":"10.0.1.10","capacity":50},
  {"id":"instance-2","host":"10.0.1.11","capacity":50},
  {"id":"instance-3","host":"10.0.1.12","capacity":50}
]'
```

The Fleet Manager will:
1. Load balance across instances
2. Monitor instance health
3. Route new agents to instances with capacity
4. Failover to healthy instances

## Monitoring & Debugging

### View Queue Status

```bash
# Using Redis CLI
redis-cli

# List all queues
KEYS bull:*

# Check queue depth
LLEN bull:fleet-deployment:wait

# View failed jobs
LRANGE bull:fleet-deployment:failed 0 -1
```

### Logs

Fleet Mode logs all operations:

```
[FleetManager] Created fleet cl... with 100 agents
[FleetManager] Deploying fleet cl...: 100 agents in 10 batches
[FleetWorker] Processing batch 1/10 for fleet cl...
[OpenClawProvider] Deployed agent cl... to instance local-1 in 2345ms
[FleetManager] Fleet cl... completed: running
```

### Events

Listen for fleet events:

```typescript
import { fleetManager } from "@/lib/fleet/manager";

fleetManager.on("fleet.deploying", ({ fleetId, totalAgents }) => {
  console.log(`Fleet ${fleetId} deploying ${totalAgents} agents`);
});

fleetManager.on("agent.deployed", ({ fleetId, agentId }) => {
  console.log(`Agent ${agentId} deployed in fleet ${fleetId}`);
});

fleetManager.on("agent.failed", ({ fleetId, agentId, error }) => {
  console.error(`Agent ${agentId} failed:`, error);
});
```

## Troubleshooting

### Deployment Stuck

1. Check Redis connection: `redis-cli ping`
2. Check worker logs for errors
3. Verify OpenClaw instances are healthy
4. Check queue status in Redis

### High Failure Rate

1. Reduce batch size
2. Lower concurrency limit
3. Check OpenClaw instance capacity
4. Verify network connectivity to instances

### Performance Issues

1. Increase concurrency (if resources available)
2. Add more OpenClaw instances
3. Use larger batch sizes (20-50)
4. Enable Redis persistence

## Future Enhancements

- [ ] Kubernetes provider support
- [ ] Auto-scaling based on load
- [ ] Geographic distribution
- [ ] Cost tracking and optimization
- [ ] Agent templates marketplace
- [ ] Advanced health checks
- [ ] Custom deployment strategies

## Support

For issues and feature requests, please open an issue on GitHub or contact support.
