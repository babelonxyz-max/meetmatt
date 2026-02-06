# Devin AI Integration Guide

## Overview
The Matt AI platform integrates with Devin AI for automated agent deployment. This document explains the integration points and how to configure Devin for your deployment pipeline.

## Current Integration Status

### ✅ Implemented
1. **Agent Creation API** (`/api/agents/route.ts`)
   - Creates Devin session when agent is deployed
   - Polls for completion status
   - Updates agent status in database

2. **Devin Session Management** (`/lib/devin.ts`)
   - Creates Devin sessions with agent configuration
   - Polls for session completion
   - Handles success/failure states

3. **Wallet Pool System** (`/lib/walletPool.ts`)
   - Pre-generates burner wallets for USDH payments
   - Manages wallet lifecycle
   - Handles fund recovery

### 🔧 Configuration Required

#### 1. Devin API Setup
Set these environment variables in Vercel:

```bash
DEVIN_API_KEY=your_devin_api_key
DEVIN_BASE_URL=https://api.devin.com/v1  # or your Devin endpoint
```

#### 2. USDH Payment Flow
The system uses burner wallets for USDH payments:

1. **Wallet Pool Generation**
   ```bash
   POST /api/admin/wallet-pool
   Authorization: Bearer your_admin_token
   Body: { "count": 100 }
   ```

2. **Payment Flow**
   - User pays to assigned burner wallet
   - System monitors for payment
   - Upon confirmation, triggers Devin deployment
   - Excess funds can be recovered to master wallet

#### 3. Devin Prompt Template

The current Devin integration sends this prompt:

```typescript
const prompt = `
Create a Telegram bot for "${config.name}".
Use case: ${config.useCase}
Capabilities: ${config.scope}
Contact method: ${config.contactMethod}

Requirements:
1. Set up bot on Telegram
2. Configure webhook
3. Implement basic responses
4. Provide bot username and auth code

Return the bot username and a verification code.
`;
```

## Testing Burner Wallets

### Generate Test Wallets
```bash
curl -X POST https://meetmatt.xyz/api/admin/wallet-pool \
  -H "Authorization: Bearer $ADMIN_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

### Check Wallet Stats
```bash
curl https://meetmatt.xyz/api/admin/wallet-pool \
  -H "Authorization: Bearer $ADMIN_AUTH_TOKEN"
```

### Test USDH Payment
1. Get a wallet address from the pool
2. Send USDH to that address
3. Monitor payment status in dashboard
4. Verify agent deployment triggers

## Devin Webhook Setup

Configure Devin to send webhooks to:
```
POST https://meetmatt.xyz/api/agents?id={agentId}
```

Webhook payload should include:
```json
{
  "status": "completed",
  "botUsername": "@your_bot_name",
  "telegramLink": "https://t.me/your_bot_name",
  "authCode": "verification_code"
}
```

## Environment Variables

Create a `.env.local` file:

```bash
# Devin AI
DEVIN_API_KEY=your_devin_api_key_here
DEVIN_BASE_URL=https://api.devin.com/v1

# Admin
ADMIN_AUTH_TOKEN=your_secure_random_token

# HyperEVM / USDH
HYPEREVM_RPC_URL=https://api.hyperliquid.xyz/evm
HYPEREVM_MASTER_WALLET=your_master_wallet_address
HYPEREVM_MASTER_KEY=your_master_wallet_private_key

# Database
DATABASE_URL=your_neon_postgres_url

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_secret

# NowPayments (for crypto payments)
NOWPAYMENTS_API_KEY=your_nowpayments_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
```

## Next Steps for Full Devin Integration

1. **Get Devin API Access**
   - Apply for Devin API at https://devin.ai
   - Obtain API key and configure endpoints

2. **Configure Webhooks**
   - Set up Devin webhooks to notify your API
   - Test webhook delivery

3. **Test End-to-End Flow**
   - Create agent through UI
   - Complete payment
   - Verify Devin session created
   - Confirm bot deployment

4. **Monitoring**
   - Check `/dashboard` for agent status
   - Monitor `/api/admin/wallet-pool` for wallet stats
   - Review Vercel logs for errors

## Support

For Devin API issues, contact: support@devin.ai
For Matt platform issues, check logs in Vercel dashboard.
