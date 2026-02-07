const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_nYxd5Qzl6GvW@ep-lingering-grass-aijhxo4g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  console.log('🔍 Checking wallet pool...\n');
  
  try {
    const result = await pool.query('SELECT id, address, status, assigned_to_session FROM wallet_pool ORDER BY created_at DESC LIMIT 10');
    const wallets = result.rows;
    
    if (wallets.length === 0) {
      console.log('❌ No wallets found in database!');
      process.exit(1);
    }
    
    console.log(`✅ Found ${wallets.length} wallet(s):\n`);
    console.log('ID | Address | Status | Assigned');
    console.log('---|---------|--------|----------');
    
    wallets.forEach(w => {
      const shortAddr = w.address.slice(0, 14) + '...' + w.address.slice(-6);
      const assigned = w.assigned_to_session ? w.assigned_to_session.slice(0, 10) + '...' : 'none';
      const statusIcon = w.status === 'available' ? '✅' : '❌';
      console.log(`${w.id} | ${shortAddr} | ${statusIcon} ${w.status} | ${assigned}`);
    });
    
    const available = wallets.filter(w => w.status === 'available').length;
    console.log(`\n📊 Summary: ${available}/${wallets.length} available for payments`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
