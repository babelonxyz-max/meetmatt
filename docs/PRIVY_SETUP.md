# Privy Authentication Setup

## Overview
Meet Matt uses [Privy](https://privy.io) for seamless Web3 authentication, supporting:
- Email login
- Social logins (Google, Twitter, Discord)
- Wallet connection (MetaMask, Rainbow, etc.)
- Embedded wallets (MPC - no external wallet needed)

## Setup Instructions

### 1. Create Privy App
1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Sign up/login
3. Create a new app called "Meet Matt"
4. Note down the **App ID** and **App Secret**

### 2. Configure Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_PRIVY_APP_ID=cm-your-app-id
PRIVY_APP_ID=cm-your-app-id
PRIVY_APP_SECRET=your-app-secret
```

### 3. Configure Privy Dashboard Settings

#### Login Methods
Enable these in the dashboard:
- ✅ Email OTP
- ✅ Google
- ✅ Twitter/X
- ✅ Discord
- ✅ External Wallets (MetaMask, Rainbow, etc.)
- ✅ Embedded Wallets

#### Embedded Wallet Settings
Set embedded wallets to:
- **Creation**: `On login (for users without a wallet)`
- **Recovery**: User's login method (email/social)

#### Chain Configuration
Add custom chain for HyperEVM:
- **Chain ID**: 998
- **RPC URL**: https://rpc.hyperliquid.xyz/evm
- **Currency**: HYPER

### 4. Test Authentication
1. Start dev server: `npm run dev`
2. Click "Get Started" in navbar
3. Try different login methods

## User Flow

### First Time User
1. Clicks "Get Started"
2. Chooses login method (email/social/wallet)
3. Privy creates embedded wallet (if no wallet connected)
4. User is synced to our database
5. User can now deploy agents

### Returning User
1. Clicks "Get Started"
2. Same login method auto-detects
3. Fast re-authentication
4. Previous agents loaded from database

## Security Notes

- **No private keys stored**: Privy uses MPC - keys are never in one place
- **Session tokens**: Short-lived access tokens (15 min)
- **Database sync**: We store only public data (Privy ID, email, wallet address)

## API Usage

### Client Side
```tsx
import { usePrivy } from "@privy-io/react-auth";

function MyComponent() {
  const { authenticated, user, login, logout } = usePrivy();
  // ...
}
```

### Server Side
```ts
import { privyClient } from "@/lib/privy";

// Verify token
const user = await privyClient.getUser(token);
```
