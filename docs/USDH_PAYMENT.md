# USDH on HyperEVM Payment Integration

**Token:** USDH (Hypers stablecoin on HyperEVM)  
**Discount:** 10% ($135 instead of $150)  
**Network:** HyperEVM (Hyperliquid's EVM)

---

## Architecture

```
User selects USDH
    ↓
Generate burner address (unique per payment)
    ↓
Show address + amount to user
    ↓
Monitor blockchain for incoming transfer
    ↓
Funds received → Transfer to master wallet
    ↓
Payment confirmed → Deploy agent
```

---

## Components

### 1. Burner Wallet Generation
- Create new EVM wallet for each payment
- Store private key securely (encrypted)
- Map address to user session

### 2. Blockchain Monitoring
- Poll HyperEVM RPC for balance changes
- Listen for USDH transfers to burner address
- Confirm after N blocks

### 3. Auto-Transfer
- Once funds received, transfer to master wallet
- Use burner wallet's private key
- Transfer native token (for gas) + USDH

### 4. Master Wallet
- Your specified wallet receives all funds
- Set via environment variable

---

## Implementation

### Environment Variables
```env
# HyperEVM RPC
HYPEREVM_RPC_URL="https://rpc.hyperliquid.xyz/evm"

# Master wallet (receives all payments)
HYPEREVM_MASTER_WALLET="0xYourMasterWalletAddress"

# For auto-transfer (optional - can use burner key)
HYPEREVM_RELAYER_PRIVATE_KEY="0x..."
```

---

## Smart Contract Addresses

**HyperEVM Mainnet:**
- USDH: `0x...` (need to confirm)
- Chain ID: `998` (need to confirm)

---

## Flow

### Step 1: User Selects USDH
- Show 10% discount: $150 → $135
- Generate burner address
- Show: "Send 135 USDH to: 0x..."

### Step 2: Wait for Payment
- Poll every 5 seconds
- Check USDH balance of burner address
- Check if balance >= 135 USDH

### Step 3: Confirm & Transfer
- Confirm after 2 blocks
- Transfer USDH to master wallet
- Mark payment as complete
- Deploy agent

---

## Security Considerations

1. **Burner keys:** Store encrypted, delete after transfer
2. **Transfer confirmation:** Wait for blocks to avoid reorgs
3. **Gas management:** Ensure burner has gas for transfer
4. **Amount validation:** Exact amount vs minimum amount

---

## Cost Analysis

| Item | Cost |
|------|------|
| User pays | 135 USDH (~$135) |
| Gas for transfer | ~$0.01-0.05 |
| Your revenue | ~$134.95 |
| Discount given | $15 |

---

## Next Steps

1. Confirm HyperEVM details (chain ID, USDH contract)
2. Implement burner wallet generation
3. Set up blockchain monitoring
4. Implement auto-transfer
5. Add to payment UI
