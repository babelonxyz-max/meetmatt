/**
 * Complete Wallet Setup Script
 * Generates PM wallet (if needed) + burner wallet pool
 * 
 * Usage:
 *   npx tsx scripts/setup-wallets.ts              # Generate 100 wallets
 *   npx tsx scripts/setup-wallets.ts 200          # Generate 200 wallets
 *   npx tsx scripts/setup-wallets.ts --pm-only    # Just setup PM wallet
 */
import "dotenv/config";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { generateWalletPool, getWalletPoolStats } from "../lib/walletPool";
import { getHyperEVMProvider } from "../lib/hyperevm";

const PM_FUND_AMOUNT = ethers.parseEther("5"); // 5 HYPER for gas reserves

async function setupPMWallet(): Promise<{ address: string; privateKey: string; created: boolean }> {
  console.log("=== PM Wallet Setup ===\n");
  
  // Check if PM wallet already exists in env
  const existingKey = process.env.PM_WALLET_KEY;
  const existingMaster = process.env.HYPEREVM_MASTER_WALLET;
  
  if (existingKey && existingMaster) {
    console.log("✅ PM wallet already configured");
    const wallet = new ethers.Wallet(existingKey);
    console.log(`   Address: ${wallet.address}`);
    
    const provider = getHyperEVMProvider();
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} HYPER`);
    
    if (balance < ethers.parseEther("1")) {
      console.log("\n⚠️  WARNING: Low balance! Fund this address with HYPER:");
      console.log(`   ${wallet.address}`);
      console.log(`   Recommended: ${ethers.formatEther(PM_FUND_AMOUNT)} HYPER`);
    }
    
    await provider.destroy();
    return { address: wallet.address, privateKey: existingKey, created: false };
  }
  
  // Generate new PM wallet
  console.log("🆕 Generating new PM wallet...");
  const wallet = ethers.Wallet.createRandom();
  
  console.log(`\n🔑 PM Wallet Generated:`);
  console.log(`   Address:    ${wallet.address}`);
  console.log(`   Private Key: ${wallet.privateKey}`);
  
  // Save to .env.local
  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  
  // Remove old entries if exist
  envContent = envContent.replace(/PM_WALLET_KEY=.*/g, "");
  envContent = envContent.replace(/HYPEREVM_MASTER_WALLET=.*/g, "");
  envContent = envContent.replace(/HYPEREVM_MASTER_KEY=.*/g, "");
  envContent = envContent.trim();
  
  // Add new entries
  const newEntries = `
# PM Wallet (Relayer) - Generated ${new Date().toISOString()}
PM_WALLET_KEY=${wallet.privateKey}
HYPEREVM_MASTER_KEY=${wallet.privateKey}
HYPEREVM_MASTER_WALLET=${wallet.address}
`;
  
  fs.writeFileSync(envPath, envContent + newEntries);
  console.log(`\n💾 Saved to .env.local`);
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("   1. This wallet needs HYPER for gas!");
  console.log("   2. Send HYPER to this address before generating burner wallets:");
  console.log(`      ${wallet.address}`);
  console.log(`   3. Recommended amount: ${ethers.formatEther(PM_FUND_AMOUNT)} HYPER`);
  console.log("   4. BACKUP .env.local - these keys cannot be recovered!");
  
  return { address: wallet.address, privateKey: wallet.privateKey, created: true };
}

async function generateBurnerWallets(count: number, pmAddress: string) {
  console.log("\n=== Burner Wallet Pool ===\n");
  
  const provider = getHyperEVMProvider();
  const pmBalance = await provider.getBalance(pmAddress);
  
  console.log(`PM Wallet Balance: ${ethers.formatEther(pmBalance)} HYPER`);
  
  // Calculate needed gas
  const gasPerWallet = ethers.parseEther("0.001"); // For approval
  const neededGas = gasPerWallet * BigInt(count);
  
  console.log(`Wallets to generate: ${count}`);
  console.log(`Gas needed: ${ethers.formatEther(neededGas)} HYPER`);
  
  if (pmBalance < neededGas) {
    console.log("\n❌ ERROR: Insufficient HYPER for gas!");
    console.log(`   Required: ${ethers.formatEther(neededGas)} HYPER`);
    console.log(`   Current:  ${ethers.formatEther(pmBalance)} HYPER`);
    console.log(`   Send HYPER to: ${pmAddress}`);
    await provider.destroy();
    process.exit(1);
  }
  
  await provider.destroy();
  
  // Generate wallets
  console.log("\n🚀 Generating wallets...");
  const addresses = await generateWalletPool(count);
  
  console.log(`\n✅ Generated ${addresses.length} wallets`);
  console.log(`\nFirst 5 addresses:`);
  addresses.slice(0, 5).forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr}`);
  });
  
  // Show stats
  const stats = await getWalletPoolStats();
  console.log(`\n📊 Pool Stats:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   Available: ${stats.available}`);
  console.log(`   PM Approved: ${stats.pmApproved}`);
}

async function main() {
  const args = process.argv.slice(2);
  const pmOnly = args.includes("--pm-only");
  const count = parseInt(args.find(a => !a.startsWith("--")) || "100") || 100;
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Meet Matt - Wallet Pool Setup                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  // Step 1: Setup PM wallet
  const pmWallet = await setupPMWallet();
  
  if (pmOnly) {
    console.log("\n✅ PM wallet setup complete (skipping burner generation)");
    return;
  }
  
  if (pmWallet.created) {
    console.log("\n⏸️  PAUSE: Fund PM wallet before continuing!");
    console.log("   Press Enter after funding...");
    await new Promise(resolve => process.stdin.once("data", resolve));
  }
  
  // Step 2: Generate burner wallets
  await generateBurnerWallets(count, pmWallet.address);
  
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ Setup complete!");
  console.log("\nNext steps:");
  console.log("1. Restart dev server to load new env vars");
  console.log("2. Check pool status: GET /api/admin/wallet-pool");
  console.log("3. Test payment flow");
}

main().catch(err => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
