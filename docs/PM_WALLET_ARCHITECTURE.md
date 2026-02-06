# PM Wallet Relayer Architecture

## Overview
Instead of funding every burner wallet with 0.05 HYPER (~$1), we use a **PM (Payment Manager) wallet** that:
1. Pays gas for all transfers
2. Executes `transferFrom` on behalf of burner wallets
3. Only needs ~0.001 HYPER per wallet for approval setup

## Capital Efficiency Comparison

| Approach | Cost per wallet | 100 wallets | 1000 wallets |
|----------|----------------|-------------|--------------|
| **Pre-fund all** | 0.05 HYPER | 5 HYPER (~$100) | 50 HYPER (~$1000) |
| **PM Relayer** | 0.001 HYPER | 0.1 HYPER (~$2) | 1 HYPER (~$20) |
| **Savings** | **98%** | **$98 saved** | **$980 saved** |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   User      │────▶│ Burner Wallet│────▶│  PM Wallet      │
│             │     │ (no gas!)    │     │  (holds gas)    │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                     ┌────────────────────────────┘
                     │ execute transferFrom
                     ▼
            ┌─────────────────┐
            │  Master Wallet  │
            │  (receives USDH)│
            └─────────────────┘
```

## Step-by-Step Flow

### 1. Wallet Assignment (One-time gas: 0.001 HYPER)
```
PM Wallet ──0.001 HYPER──▶ Burner Wallet
                              │
                              ▼ execute approve(PM, infinity)
                        PM can now spend USDH on behalf of burner
```

### 2. Payment Detection (No gas needed)
```
User ──USDH──▶ Burner Wallet
                (just holds funds, no action needed)
```

### 3. Transfer Execution (PM pays gas)
```
PM Wallet ──gas──▶ execute transferFrom(burner, master, amount)
                     (transfers all USDH to master)
```

## Setup

### 1. Environment Variables
```bash
# PM Wallet (can be same as master or separate)
PM_WALLET_KEY=0x...          # Private key of PM wallet
HYPEREVM_MASTER_WALLET=0x... # Master wallet (receives USDH)

# Same wallet can be both PM and Master:
PM_WALLET_KEY=0xabc...       # Same as master
HYPEREVM_MASTER_WALLET=0xabc... # Same address
```

### 2. Fund PM Wallet
PM wallet needs HYPER for gas:
- **For approvals**: 0.001 HYPER × number of wallets
- **For transfers**: ~0.0001 HYPER per transfer

Example: 100 wallets = 0.1 HYPER for approvals + gas for transfers

### 3. Generate Wallets (No pre-funding!)
```bash
npx tsx scripts/generate-wallets.ts 100
```
Wallets are generated with NO gas. Approval happens at assignment.

## Security Considerations

### PM Wallet Compromise
If PM wallet is stolen:
- **Risk**: Attacker can transfer USDH from assigned wallets
- **Mitigation**: Wallets are single-use, assigned only during active payment
- **Recovery**: Rotate PM wallet, regenerate pool

### Approval Safety
- Burner wallets approve PM wallet for **infinite** USDH
- This is safe because wallets are single-use
- After transfer, wallet is marked "used" and never reassigned

### Key Separation
You can use different wallets:
```bash
PM_WALLET_KEY=0x...        # Hot wallet with small gas budget
HYPEREVM_MASTER_KEY=0x...  # Cold wallet receiving funds (different!)
HYPEREVM_MASTER_WALLET=0x... # Cold wallet address
```

## Fallback Mechanisms

### If PM Transfer Fails
1. System tries `executePMTransfer()` (PM pays gas via transferFrom)
2. If that fails, tries `executeDirectTransfer()` (burner pays gas)
3. If both fail, admin can manually recover via API

### If Approval Failed During Assignment
- Wallet is still assigned but `pmApproved=false`
- System will use direct transfer (burner pays gas)
- Can re-approve via admin API

## API Endpoints

### Check Pool Stats
```bash
GET /api/admin/wallet-pool
{
  "total": 100,
  "available": 50,
  "assigned": 5,
  "used": 45,
  "pmApproved": 55  // How many have PM approval
}
```

### Recover Stuck Funds
```bash
PATCH /api/admin/wallet-pool
{
  "walletId": "xxx",
  "toAddress": "optional"
}
```

## Monitoring

Track these metrics:
1. **PM wallet HYPER balance** - Alert if < 1 HYPER
2. **Failed PM transfers** - Should be rare, investigate if > 1%
3. **Approval success rate** - Should be 100%, investigate failures

## Troubleshooting

### "PM not approved" error
- Wallet was assigned before PM setup
- Solution: Re-approve or use direct transfer

### "Insufficient allowance" error
- Approval was consumed (shouldn't happen with infinite)
- Solution: Re-approve via admin

### PM wallet out of gas
- Fund PM wallet with HYPER
- Should have at least 1 HYPER for buffer
