# Meet Matt - AI Agent Integration PRD

## Overview

Meet Matt is an automated AI bot deployment platform where users request custom Telegram bots powered by OpenClaw/Kimi K2.5. This document provides the complete specification for an AI coding agent to finalize the integration work.

## Current State

The provisioning system foundation is built with:
- Type definitions for all entities
- Input validation and sanitization
- Fallback Telegram account management with health monitoring
- API routes for provisioning and verification
- EC2 user data script generation

**What's Stubbed (Needs Implementation):**
1. AWS SDK calls for EC2 instance management
2. Database persistence (currently in-memory)
3. Telethon automation for bot creation via BotFather
4. Payment webhook integration
5. Admin alert notifications (Telegram/email)

## Architecture

```
User Request → Meet Matt Frontend → API Routes → Provisioning System
                                                        ↓
                                              ┌─────────────────┐
                                              │ Account Manager │
                                              │ (Fallback Logic)│
                                              └────────┬────────┘
                                                       ↓
                                              ┌─────────────────┐
                                              │ Telethon Script │
                                              │ (Bot Creation)  │
                                              └────────┬────────┘
                                                       ↓
                                              ┌─────────────────┐
                                              │   AWS Provider  │
                                              │ (EC2 Instances) │
                                              └─────────────────┘
```

## Files to Modify

### 1. `lib/provisioning/aws-provider.ts`

**Current:** Stubbed with mock implementations
**Needed:** Real AWS SDK v3 integration

```typescript
// Required implementations:
import { EC2Client, RunInstancesCommand, DescribeInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";

// Functions to implement:
async function createEC2Instance(config: ProvisioningConfig): Promise<{ instanceId: string; publicIp: string }>
async function waitForInstanceReady(instanceId: string): Promise<void>
async function terminateEC2Instance(instanceId: string): Promise<void>
async function executeSSHCommand(ip: string, command: string): Promise<string>
```

**Environment Variables Required:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (default: us-east-1)

**EC2 Instance Specs:**
- AMI: Ubuntu 22.04 LTS (ami-0c7217cdde317cfec for us-east-1)
- Instance Type: t3.small (2 vCPU, 2GB RAM)
- Storage: 20GB gp3
- Security Group: Allow SSH (22), HTTPS (443)

### 2. `lib/provisioning/telegram-bot.ts`

**Current:** Helper functions for bot naming
**Needed:** Telethon integration for automated bot creation

```typescript
// Add these functions:
async function createBotViaBotFather(
  account: TelegramCreatorAccount,
  botName: string,
  botUsername: string,
  botDescription?: string
): Promise<{ success: boolean; token?: string; error?: string }>

async function setBotProfileImage(
  account: TelegramCreatorAccount,
  botUsername: string,
  imagePath: string
): Promise<boolean>
```

**Telethon Script Template (Python):**
```python
from telethon import TelegramClient
from telethon.tl.functions.messages import SendMessageRequest

async def create_bot(api_id, api_hash, session_file, bot_name, bot_username):
    client = TelegramClient(session_file, api_id, api_hash)
    await client.start()
    
    # Send /newbot to BotFather
    await client.send_message('@BotFather', '/newbot')
    await asyncio.sleep(2)
    
    # Send bot name
    await client.send_message('@BotFather', bot_name)
    await asyncio.sleep(2)
    
    # Send username
    await client.send_message('@BotFather', bot_username)
    await asyncio.sleep(2)
    
    # Get response with token
    messages = await client.get_messages('@BotFather', limit=1)
    # Parse token from message
    
    await client.disconnect()
    return token
```

### 3. `lib/provisioning/account-manager.ts`

**Current:** Complete fallback logic implemented
**Needed:** Database persistence and admin notifications

```typescript
// Add database integration:
async function loadAccountsFromDB(): Promise<void>
async function saveAccountToDB(account: TelegramCreatorAccount): Promise<void>
async function updateAccountStatusInDB(accountId: string, status: string): Promise<void>

// Add notification integration:
async function sendAdminAlert(alert: AccountHealthAlert): Promise<void>
// Options: Telegram bot message, email, or webhook
```

### 4. Database Schema (New File: `lib/db/schema.ts`)

**Create Prisma/Drizzle schema:**

```typescript
// Telegram Creator Accounts
model TelegramAccount {
  id          String   @id @default(cuid())
  phone       String   @unique
  apiId       Int
  apiHash     String
  sessionFile String
  status      String   @default("active") // active, locked, banned, unknown
  priority    Int      @default(0)
  lastUsed    DateTime?
  lastError   String?
  createdBots Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Provisioned Instances
model Instance {
  id               String   @id @default(cuid())
  userId           String
  publicIp         String?
  status           String   @default("provisioning")
  botToken         String?
  botUsername      String?
  verificationCode String?
  creatorAccountId String?
  ec2InstanceId    String?
  createdAt        DateTime @default(now())
  expiresAt        DateTime?
  
  @@index([userId])
  @@index([status])
}

// Verification Requests
model Verification {
  id             String   @id @default(cuid())
  instanceId     String   @unique
  code           String
  telegramUserId BigInt?
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}
```

**Recommended Database:** Neon PostgreSQL (serverless, free tier available)

### 5. Payment Integration (New File: `app/api/webhooks/payment/route.ts`)

**Stripe Webhook Handler:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Extract metadata
    const { userId, botName, packageType } = session.metadata!;
    
    // Mark payment as completed in database
    await markPaymentCompleted(session.id, userId);
    
    // Trigger provisioning
    await provisionAgent({
      userId,
      botName,
      package: packageType,
      // ... other config
    });
  }
  
  return NextResponse.json({ received: true });
}
```

**Environment Variables:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (frontend)

## Integration Steps

### Step 1: Database Setup
1. Create Neon PostgreSQL database
2. Install Prisma: `npm install prisma @prisma/client`
3. Initialize: `npx prisma init`
4. Add schema from above
5. Run migrations: `npx prisma migrate dev`

### Step 2: AWS SDK Integration
1. Install: `npm install @aws-sdk/client-ec2`
2. Replace stubbed functions in `aws-provider.ts`
3. Test instance creation/termination
4. Add SSH key management for remote commands

### Step 3: Telethon Bot Creation
1. Create Python script for BotFather automation
2. Store script on EC2 or run locally
3. Integrate with account-manager.ts
4. Handle rate limits and errors

### Step 4: Payment Flow
1. Create Stripe account and products
2. Implement checkout session creation
3. Add webhook handler
4. Connect payment completion to provisioning

### Step 5: Admin Notifications
1. Create admin Telegram bot
2. Implement alert sending in account-manager.ts
3. Add email fallback (optional)

## Environment Variables Summary

```env
# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Telegram (Primary Account)
TELEGRAM_API_ID=37034441
TELEGRAM_API_HASH=7ce778ed9361c540f96d1254ae81572b
TELEGRAM_PHONE=+855973773731
TELEGRAM_SESSION=/home/ubuntu/.telegram_session

# Telegram Fallback Accounts (optional)
TELEGRAM_FALLBACK_1_PHONE=
TELEGRAM_FALLBACK_1_API_ID=
TELEGRAM_FALLBACK_1_API_HASH=
TELEGRAM_FALLBACK_1_SESSION=

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Admin Notifications
ADMIN_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_ID=
```

## Testing Checklist

- [ ] Create EC2 instance via AWS SDK
- [ ] SSH into instance and run commands
- [ ] Create Telegram bot via Telethon
- [ ] Store/retrieve data from database
- [ ] Process Stripe webhook
- [ ] Trigger provisioning after payment
- [ ] Send admin alert when account fails
- [ ] Fallback to next account when primary fails
- [ ] Verify user ownership via code
- [ ] Activate instance after verification

## Security Considerations

1. **Never log or expose:**
   - Telegram API hashes
   - Bot tokens
   - AWS credentials
   - Stripe secrets

2. **Input validation:**
   - All user inputs are sanitized (already implemented)
   - SQL injection prevention via Prisma
   - XSS prevention in bot names

3. **Rate limiting:**
   - Removed IP-based rate limiting per user request
   - Keep anti-spam cooldown (1 second between requests)

4. **Account protection:**
   - Monitor for Telegram account bans
   - Automatic failover to fallback accounts
   - Alert admin immediately when accounts fail

## Deployment

1. **Vercel** (Frontend + API Routes)
   - Connect GitHub repo
   - Add environment variables
   - Deploy

2. **Database** (Neon)
   - Create database
   - Run migrations
   - Update DATABASE_URL

3. **Stripe**
   - Create products/prices
   - Configure webhook endpoint
   - Test with Stripe CLI

## Support

For questions about this integration:
- Review existing code in `/lib/provisioning/`
- Check types in `types.ts` for all interfaces
- Account manager logic is in `account-manager.ts`
