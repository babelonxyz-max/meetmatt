# Meet Matt XYZ - Agent Documentation

## Project Overview

**Meet Matt** is a futuristic AI assistant deployment platform. Users chat with "Matt" to configure and deploy AI agents without signup/KYC. Payments are handled via cryptocurrency (USDT/USDC on multiple chains).

**Live URLs:**
- Production: https://meetmatt.xyz
- Vercel: https://my-1kjtmdvsr-marks-projects-95f7cc92.vercel.app

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1.6 (Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Audio | Tone.js |
| Database | Prisma + SQLite |
| Auth | Anonymous sessions (localStorage) |
| Deployment | Vercel |

---

## Architecture

### Frontend (`app/`)
```
app/
├── page.tsx              # Main landing with chat wizard
├── layout.tsx            # Root layout
├── globals.css           # Global styles
├── providers.tsx         # Context providers
├── components/
│   ├── AIOrb.tsx         # Animated AI orb visual
│   ├── PaymentModal.tsx  # Crypto payment UI
│   └── LaunchWizard.tsx  # (legacy)
├── dashboard/
│   └── page.tsx          # User's deployed agents
└── api/
    ├── agents/
    │   └── route.ts      # CRUD for agents
    └── payment/
        ├── route.ts      # Create payment
        └── check/
            └── route.ts  # Check payment status
```

### Backend (`lib/`)
```
lib/
├── prisma.ts             # Prisma client singleton
├── crypto-payment.ts     # Payment logic & blockchain checks
├── session.ts            # Anonymous session management
├── audio.ts              # Tone.js sound effects
└── utils.ts              # Utilities
```

---

## Key Features

### 1. Conversational Deployment Wizard
- Split-screen layout: AI orb (left) + chat (right)
- Step-by-step flow:
  1. Welcome → Name agent → Purpose → Features → Tier → Payment → Deploy
- Real-time message animations with Framer Motion
- Audio feedback on interactions (Tone.js)

### 2. AI Orb Visual
- Liquid morphing gradients (cyan/purple)
- Rotating orbital rings
- Energy particles animation
- State-based animations:
  - `idle`: Slow breathing
  - `listening`: Faster pulse
  - `thinking`: Rapid pulses + rings

### 3. Crypto Payment System
**Supported currencies:**
- USDT: BSC, Solana, TRON, HyperEVM
- USDC: Base, Solana, HyperEVM, Arbitrum
- USDH: HyperEVM

**Payment flow:**
1. User selects tier + currency
2. System generates payment address
3. User sends crypto to address
4. System polls blockchain for confirmation
5. On confirmation → deploy agent

**Demo Mode:**
- When `EVM_PAYMENT_ADDRESS`, `SOL_PAYMENT_ADDRESS`, `TRON_PAYMENT_ADDRESS` are not set
- Shows warning banner
- Auto-confirms after 3 seconds
- Uses mock addresses

### 4. Anonymous Sessions
- No signup required
- Session ID stored in `localStorage` (`matt_session_id`)
- All agents linked to session ID
- Pending config stored during payment flow

---

## Database Schema

```prisma
model Agent {
  id        String   @id @default(cuid())
  sessionId String   // localStorage session ID
  name      String   // Agent name
  purpose   String   // What it helps with
  features  String   // JSON array of features
  tier      String   // starter | pro | enterprise
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Payment {
  id          String    @id @default(cuid())
  sessionId   String
  tier        String
  currency    String    // e.g., "USDT_BSC"
  amount      Float     // Amount in crypto
  address     String    // Payment address
  status      String    @default("pending") // pending | confirmed | expired
  txHash      String?   // Transaction hash
  confirmedAt DateTime?
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
}
```

---

## Environment Variables

Create `.env.local` for local development:

```env
# Database
DATABASE_URL="file:./dev.db"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Crypto Payment Addresses (leave empty for demo mode)
# EVM_PAYMENT_ADDRESS="0x..."      # For USDT BSC, USDC Base, etc.
# SOL_PAYMENT_ADDRESS="..."         # For Solana tokens
# TRON_PAYMENT_ADDRESS="T..."       # For TRON USDT

# Optional: API keys for blockchain monitoring
# BSCSCAN_API_KEY="..."
# BASESCAN_API_KEY="..."
# ARBISCAN_API_KEY="..."
# HELIUS_API_KEY="..."              # Solana
# TRONGRID_API_KEY="..."            # TRON
```

---

## Development Workflow

### Setup
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Database Changes
```bash
npx prisma migrate dev --name description
npx prisma generate
```

### Build
```bash
npm run build
```

---

## Deployment

### Vercel (Current)
```bash
npx vercel --prod
```

### GitHub Setup (One-time)
1. Create repo on GitHub
2. Add remote: `git remote add origin git@github.com:USER/REPO.git`
3. Push: `git push -u origin main`

### Environment Variables on Vercel
Set in Vercel Dashboard → Project Settings → Environment Variables:
- `DATABASE_URL` (SQLite is ephemeral on Vercel - data resets on deploy)
- Payment addresses (when ready for real payments)

---

## Custom Domain Setup

**Current:** meetmatt.xyz

**If domain not working:**
1. Check DNS: `dig meetmatt.xyz NS` should show Vercel nameservers
2. Verify alias: `vercel alias ls`
3. Re-alias if needed: `vercel alias set DEPLOYMENT_URL meetmatt.xyz`

**Nameservers should be:**
- ns1.vercel-dns.com
- ns2.vercel-dns.com

---

## Audio System (Tone.js)

Sounds triggered on:
- `playMessageSent()` - User sends message
- `playMessageReceived()` - Assistant responds
- `playOptionSelected()` - User clicks option
- `playSuccess()` - Payment confirmed / Deploy complete
- `playHover()` - Hover over interactive elements

Audio initializes on first user interaction (browser autoplay policy compliance).

---

## Common Issues & Fixes

### Issue: Domain not loading
**Fix:**
```bash
vercel alias set DEPLOYMENT_URL meetmatt.xyz
```

### Issue: Build fails on Prisma
**Fix:** Ensure `prisma/schema.prisma` doesn't have `url` field in datasource. Connection is handled via `prisma.config.ts`.

### Issue: Database errors in build
**Fix:** `lib/prisma.ts` has mock for build phase. Should auto-resolve.

### Issue: Audio not playing
**Fix:** Audio requires user interaction. First click enables audio context.

---

## Future Improvements

1. **Database:** Migrate to PostgreSQL for persistence on Vercel
2. **Payments:** Add real blockchain monitoring with webhooks
3. **Features:** Integrate with actual AI deployment APIs
4. **Auth:** Optional user accounts for cross-device access
5. **Mobile:** Better responsive design for small screens

---

## File Structure

```
my-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── dashboard/         # Dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Context providers
├── components/ui/          # shadcn/ui components
├── lib/                    # Utilities & backend logic
│   ├── audio.ts           # Tone.js integration
│   ├── crypto-payment.ts  # Payment system
│   ├── prisma.ts          # Database client
│   ├── session.ts         # Session management
│   └── utils.ts           # Utilities
├── prisma/
│   ├── migrations/        # Database migrations
│   ├── schema.prisma      # Database schema
│   └── config.ts          # Prisma config
├── public/                # Static assets
├── .env                   # Environment variables
├── next.config.ts         # Next.js config
├── package.json           # Dependencies
├── tailwind.config.ts     # Tailwind config
└── AGENTS.md              # This file
```

---

## Contact & Resources

- **User:** Mark (babeloxyz)
- **Domain:** meetmatt.xyz
- **Vercel Team:** marks-projects-95f7cc92
