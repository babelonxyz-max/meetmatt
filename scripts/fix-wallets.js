const { Pool } = require('pg');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Get encryption key from env or use a default for now
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || '3e87f6baacd325531a791e8681e0dee5719d3a5771518010bf8eadbc006f5b0c';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('❌ WALLET_ENCRYPTION_KEY must be 32+ characters');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_nYxd5Qzl6GvW@ep-lingering-grass-aijhxo4g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

function encryptPrivateKey(privateKey) {
  const key = ENCRYPTION_KEY.slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('🔧 Fixing wallet pool...\n');
  
  const client = await pool.connect();
  
  try {
    // 1. Delete all existing wallets (they have wrong format)
    console.log('1. Clearing old wallets...');
    await client.query('DELETE FROM wallet_pool');
    console.log('   ✅ Cleared');
    
    // 2. Generate 5 new wallets with proper encryption
    console.log('\n2. Generating 5 new encrypted wallets...\n');
    
    const wallets = [];
    for (let i = 1; i <= 5; i++) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = encryptPrivateKey(wallet.privateKey);
      
      await client.query(
        'INSERT INTO wallet_pool (id, address, encrypted_private_key, status, pm_approved, hyper_balance, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [`wallet_${i}`, wallet.address, encryptedKey, 'available', false, '0']
      );
      
      wallets.push({
        id: `wallet_${i}`,
        address: wallet.address,
        privateKey: wallet.privateKey // Show this to user for funding
      });
      
      console.log(`   ✅ Wallet ${i}: ${wallet.address}`);
    }
    
    console.log('\n📋 FUND THESE WALLETS WITH 0.001-0.002 HYPE EACH:');
    console.log('================================================');
    wallets.forEach(w => {
      console.log(`\n${w.id}:`);
      console.log(`  Address:    ${w.address}`);
      console.log(`  PrivateKey: ${w.privateKey}`);
    });
    console.log('\n================================================');
    
    // 3. Verify insertion
    const result = await client.query('SELECT COUNT(*) FROM wallet_pool');
    console.log(`\n✅ Total wallets in pool: ${result.rows[0].count}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
