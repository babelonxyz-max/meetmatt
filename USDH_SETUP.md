# USDH-Only Payment Setup

## ✅ What Changed

1. **Payment Modal** - Now ONLY accepts USDH on HyperEVM
   - Removed all other crypto options (USDT, USDC, etc.)
   - 10% discount applied: $150 → $135
   - Simpler UX for users

2. **Backend Config** - `lib/crypto-payment.ts`
   - Simplified to only support `USDH-HYPE`
   - Removed all other chains and tokens

## 🔧 Wallet Setup (2-5 wallets max)

### Option A: You Generate Wallets

Run this to generate 3 wallets:

```bash
cd /Users/mark/meetmatt
node -e "
const { Keypair } = require('@solana/web3.js');

for (let i = 1; i <= 3; i++) {
  const kp = Keypair.generate();
  console.log(\`Wallet \${i}:\`);
  console.log(\`  Public:  \${kp.publicKey.toBase58()}\`);
  console.log(\`  Private: [\${Array.from(kp.secretKey).join(',')}]\`);
  console.log('');
}
"
```

Then:
1. Fund each wallet with **0.01-0.02 SOL** for gas fees
2. Send me the **private keys** (number arrays)
3. I'll add them to your DB

### Option B: You Add Wallets Yourself

1. Edit `scripts/add-wallets-to-db.ts`
2. Add your wallets to the `WALLETS` array
3. Run: `npx ts-node scripts/add-wallets-to-db.ts`

## 💰 Payment Flow

1. User clicks "Deploy"
2. System assigns an available burner wallet from pool
3. User sends USDH to that wallet address
4. System detects payment → transfers to your main wallet
5. Deployment starts automatically

## 🔐 Security Notes

- Burner wallets only hold funds temporarily (seconds to minutes)
- After detection, funds auto-transfer to your PM wallet
- Even if private keys leaked, wallets are empty 99% of time
- 2-5 wallets is plenty for low-moderate volume

## 📊 Monitoring

Check pool status:
```bash
curl https://meetmatt.xyz/api/admin/wallet-pool \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. Generate/fund 2-5 wallets
2. Provide private keys OR run the DB script yourself
3. Test a payment flow
4. Done!
