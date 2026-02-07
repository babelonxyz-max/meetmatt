const { ethers } = require('ethers');
const fs = require('fs');

console.log('=== GENERATE 5 HYPEREVM WALLETS ===\n');
console.log('⚠️  FUND EACH WITH 0.001-0.002 HYPE FOR GAS\n');

const wallets = [];
for (let i = 1; i <= 5; i++) {
  const wallet = ethers.Wallet.createRandom();
  wallets.push({
    id: `wallet_${i}`,
    publicKey: wallet.address,
    privateKey: wallet.privateKey
  });
  console.log(`Wallet ${i}:`);
  console.log(`  Address:    ${wallet.address}`);
  console.log(`  PrivateKey: ${wallet.privateKey}`);
  console.log('');
}

// Save to JSON
fs.writeFileSync('/tmp/evm-wallets.json', JSON.stringify(wallets, null, 2));

// Generate SQL
const sql = `-- Insert 5 HyperEVM burner wallets into WalletPool
-- Run this in your database after funding the wallets with HYPE

INSERT INTO "WalletPool" ("id", "publicKey", "privateKey", "isAvailable", "createdAt", "updatedAt") VALUES
${wallets.map((w, i) => 
  `('${w.id}', '${w.publicKey}', '${w.privateKey}', true, NOW(), NOW())${i < wallets.length - 1 ? ',' : ';'}`
).join('\n')}
`;

fs.writeFileSync('/Users/mark/meetmatt/scripts/insert-evm-wallets.sql', sql);
console.log('✅ SQL saved to: scripts/insert-evm-wallets.sql');
console.log('✅ Wallets saved to: /tmp/evm-wallets.json');
