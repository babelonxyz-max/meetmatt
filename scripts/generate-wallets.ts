#!/usr/bin/env ts-node
/**
 * Generate burner wallets for USDH payment processing
 * Run with: npx ts-node scripts/generate-wallets.ts
 */

import { generateWalletPool } from "../lib/walletPool";

async function main() {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 50;
  
  console.log(`Generating ${count} burner wallets...`);
  
  try {
    const addresses = await generateWalletPool(count);
    console.log(`\n✅ Successfully generated ${addresses.length} wallets`);
    console.log("\nFirst 10 addresses:");
    addresses.slice(0, 10).forEach((addr, i) => {
      console.log(`  ${i + 1}. ${addr}`);
    });
  } catch (error) {
    console.error("❌ Failed to generate wallets:", error);
    process.exit(1);
  }
}

main();
