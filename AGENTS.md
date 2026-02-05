# Meet Matt - Project Documentation

**AI Deployment Platform** - Deploy AI agents in minutes, pay with crypto, no signup required.

---

## Quick Links

- **Production:** https://meetmatt.vercel.app
- **Repository:** https://github.com/babelonxyz-max/meetmatt
- **Custom Domain:** meetmatt.xyz (pending DNS configuration)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Animation | Framer Motion |
| Audio | Tone.js |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Payments | NOWPayments (USDT/USDC) |
| Deployment | Vercel |

---

## Project Structure

```
meetmatt/
├── app/
│   ├── components/
│   │   ├── AIOrb.tsx           # Animated AI avatar (V2 - see docs/AI_ORB_V2.md)
│   │   ├── LaunchWizard.tsx    # Chat-based deployment wizard
│   │   ├── JarvisInterface.tsx # Main chat interface
│   │   ├── PaymentModal.tsx    # Crypto payment flow
│   │   ├── Navbar.tsx          # Unified navigation
│   │   └── ThemeToggle.tsx     # Dark/light mode
│   ├── api/
│   │   ├── agents/route.ts     # Agent deployment API
│   │   └── payment/            # Payment processing
│   ├── pricing/
│   │   └── page.tsx            # Pricing page ($5/day model)
│   ├── dashboard/
│   │   └── page.tsx            # User dashboard
│   ├── page.tsx                # Main deployment page
│   └── layout.tsx              # Root layout with Navbar
├── components/ui/              # shadcn/ui components
├── lib/
│   ├── audio.ts               # Sound effects (Tone.js)
│   ├── session.ts             # Session management
│   └── prisma.ts              # Database client
├── prisma/
│   └── schema.prisma          # Database schema
└── docs/
    └── AI_ORB_V2.md           # AI Orb documentation
```

---

## Current Features

### 1. AI Orb V2
- Liquid shapeshifting animation
- Cursor-tracking eyes
- Automatic blinking
- Color cycling (Cyan → Orange → Purple → Green)
- Wizard state reactions (backflip on initialization)
- Click reactions and speech bubbles

**Documentation:** [docs/AI_ORB_V2.md](docs/AI_ORB_V2.md)

### 2. Deployment Wizard V3
- Chat-based interface with smooth animations
- 5-step flow: Name → Use Case → Scope → Contact → Confirm
- Real-life oriented options (AI Assistant, Coworker, Digital Employee)
- Multi-select scope capabilities
- Contact method selection (Telegram active, WhatsApp/Slack coming)
- Real-time AI orb reactions
- Persistent session

**Documentation:** [docs/CHAT_FLOW_V3.md](docs/CHAT_FLOW_V3.md)

### 3. Pricing
- **$150/month** unlimited plan (first month includes setup)
- No tier confusion - single plan only
- Agency comparison table
- ROI calculator

### 4. Payments
- Crypto payments via NOWPayments
- USDT/USDC support
- Clean payment modal (no oversized plan cards)
- Payment status polling
- Webhook integration

### 5. Dashboard
- View deployed agents
- Session-based access
- Quick actions

---

## Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"

# Payments (NOWPayments)
NP_API_KEY="your_nowpayments_api_key"
NP_IPN_SECRET="your_ipn_secret"

# Session
SESSION_SECRET="your_session_secret"
```

**Note:** Production needs real crypto wallet addresses configured in `lib/payments.ts`.

---

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Database commands
npx prisma migrate dev
npx prisma db push
npx prisma studio
```

---

## Deployment Checklist

- [x] Next.js 16 + Turbopack configured
- [x] TypeScript strict mode
- [x] Tailwind CSS + shadcn/ui
- [x] AI Orb V2 with all animations
- [x] Unified Navbar across all pages
- [x] Pricing page with $5/day model
- [x] Crypto payment integration
- [x] Dashboard for viewing agents
- [ ] Custom domain (meetmatt.xyz) - pending DNS
- [ ] Production PostgreSQL database
- [ ] Real crypto wallet addresses

---

## Recent Commits

```
d21a4b4 Fix AI Orb: liquid morphing, cursor-tracking eyes, wizard reactions
ca9361d Fix: unified navigation, enhanced AI Orb with reactions
8b4cb27 Add pricing page with $5/day model
```

---

## Next Steps

Ready for next development phase. Discuss priorities with team:

1. Custom domain configuration (meetmatt.xyz)
2. Production database setup
3. Real payment wallet configuration
4. Additional features (see product roadmap)

---

## Contact

**Project Lead:** Mark  
**Repository:** https://github.com/babelonxyz-max/meetmatt
