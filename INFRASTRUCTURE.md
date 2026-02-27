# Infrastructure Provisioning with Contabo

This document explains how Fleet Mode automatically provisions infrastructure on Contabo (and other providers) to run 1000s of agents.

## Architecture

```
Fleet Deployment Request
         │
         ▼
┌─────────────────────┐
│  Fleet Manager      │
│  (calculates need)  │
└──────────┬──────────┘
           │ "Need X servers for 1000 agents"
           ▼
┌─────────────────────┐
│  Infrastructure     │
│  Provisioner        │
└──────────┬──────────┘
           │ "Create X VPS instances"
           ▼
┌─────────────────────┐
│  Contabo API        │
│  (VPS provisioning) │
└──────────┬──────────┘
           │ "Instances created"
           ▼
┌─────────────────────┐
│  Cloud-Init         │
│  (installs          │
│   OpenClaw)         │
└──────────┬──────────┘
           │ "OpenClaw ready"
           ▼
┌─────────────────────┐
│  Fleet Manager      │
│  (deploys agents)   │
└─────────────────────┘
```

## Flow: Deploying 1000 Agents

### 1. Fleet Manager Receives Request
```typescript
// User wants 1000 agents
const fleet = await createFleet({
  targetAgentCount: 1000,
  config: { ... }
});
```

### 2. Calculate Required Infrastructure
```typescript
// Each OpenClaw instance can handle ~50 agents
const agentsPerInstance = 50;
const requiredInstances = Math.ceil(1000 / 50); // = 20 instances
```

### 3. Provision Servers via Contabo
```typescript
// Infrastructure Provisioner calls Contabo API
await infrastructureProvisioner.provisionForFleet({
  fleetId: "fleet-123",
  minInstances: 20,
  maxInstances: 22, // +2 for buffer
  agentsPerInstance: 50,
});
```

### 4. Contabo Creates VPS Instances
- **VPS Type**: Based on agent capacity needed
  - VPS S (4 vCPU, 8GB RAM): ~10 agents - $4.99/month
  - VPS M (6 vCPU, 16GB RAM): ~25 agents - $9.99/month  
  - VPS L (8 vCPU, 30GB RAM): ~50 agents - $19.99/month
  - VPS XL (10 vCPU, 60GB RAM): ~100 agents - $39.99/month

### 5. Cloud-Init Installs OpenClaw
Each VPS runs a startup script:
```bash
#!/bin/bash
# 1. Install Docker
# 2. Download OpenClaw
# 3. Configure and start OpenClaw
# 4. Signal ready to Fleet Manager
```

### 6. Fleet Manager Deploys Agents
Once OpenClaw instances are ready:
- Agents are distributed across instances
- Load balanced based on capacity
- Health monitored continuously

## Configuration

### Environment Variables

```bash
# Enable auto-provisioning
ENABLE_AUTO_PROVISIONING=true

# Contabo API Credentials (get from https://my.contabo.com/)
CONTABO_CLIENT_ID=your-client-id
CONTABO_CLIENT_SECRET=your-client-secret
CONTABO_API_USER=your-api-user
CONTABO_API_PASSWORD=your-api-password
CONTABO_API_URL=https://api.contabo.com

# SSH Key for instance access (optional)
CONTABO_SSH_KEY_ID=your-ssh-key-id
```

### Server Tiers

| Tier | vCPU | RAM | Storage | Max Agents | Cost/Month |
|------|------|-----|---------|------------|------------|
| Small | 2 | 4GB | 50GB SSD | 10 | ~$5 |
| Medium | 4 | 8GB | 100GB SSD | 25 | ~$10 |
| Large | 8 | 16GB | 200GB NVMe | 50 | ~$20 |
| XLarge | 16 | 32GB | 400GB NVMe | 100 | ~$40 |

## Cost Estimation

### Example: 1000 Agents

**Option 1: 20x VPS L (50 agents each)**
- 20 × $19.99 = **$399.80/month**
- Running 24/7 for 1 month

**Option 2: 10x VPS XL (100 agents each)**
- 10 × $39.99 = **$399.90/month**
- Same price, fewer instances to manage

**Option 3: Mix (optimized)**
- 10x VPS L + 5x VPS XL = $199.90 + $199.95 = **$399.85/month**

### Auto-Scaling Costs

With auto-scaling enabled:
- **Peak hours**: All instances running = $400/month
- **Off-peak**: 50% capacity = $200/month
- **Average**: ~$300/month

## API Usage

### Provision Infrastructure
```bash
curl -X POST http://localhost:3000/api/infrastructure \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-id" \
  -d '{
    "fleetId": "fleet-123",
    "minInstances": 20,
    "maxInstances": 25,
    "agentsPerInstance": 50
  }'
```

### Get Capacity
```bash
curl "http://localhost:3000/api/infrastructure?fleetId=fleet-123" \
  -H "x-user-id: user-id"

# Response:
{
  "capacity": {
    "totalSlots": 1000,
    "usedSlots": 0,
    "availableSlots": 1000,
    "servers": [...]
  },
  "cost": {
    "hourly": 0.56,
    "daily": 13.44,
    "monthly": 403.20
  }
}
```

## Setup Contabo Account

1. **Create Account**: https://contabo.com/en/
2. **Get API Credentials**:
   - Go to https://my.contabo.com/
   - Navigate to API settings
   - Create OAuth2 credentials
3. **Add Payment Method**
4. **Upload SSH Key** (optional, for debugging)

## Monitoring

### Instance Status
```
provisioning → installing → ready → active → full
```

### Health Checks
- Every 60 seconds
- CPU/Memory/Disk metrics from Contabo API
- OpenClaw health endpoint check
- Auto-restart failed instances

## Troubleshooting

### "No cloud provider configured"
- Set `ENABLE_AUTO_PROVISIONING=true`
- Add Contabo API credentials

### "Provisioning failed"
- Check Contabo API limits
- Verify payment method
- Check region availability

### "OpenClaw not starting"
- Check cloud-init logs: `/var/log/cloud-init.log`
- SSH into instance and check: `journalctl -u openclaw`

## Future Providers

The infrastructure system is designed to support multiple providers:

- **Hetzner** (cheaper, EU only)
- **AWS EC2** (more regions, higher cost)
- **Google Cloud** (good for ML workloads)
- **DigitalOcean** (simple, good pricing)

Add new providers by implementing the `CloudProvider` interface in `lib/infrastructure/providers/`.

## Limits

| Resource | Limit |
|----------|-------|
| Max instances per fleet | 100 |
| Max agents per instance | 100 |
| Instances per API call | 10 |
| Provisioning timeout | 10 minutes |

## Security

- Each instance gets unique auth token
- Firewall configured (only port 18789 + SSH)
- No sensitive data in cloud-init scripts
- All API calls use HTTPS
