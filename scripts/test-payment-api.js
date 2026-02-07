const fetch = require('node-fetch');

async function testPayment() {
  const sessionId = 'test-' + Date.now();
  
  console.log('Testing HyperEVM payment API...\n');
  
  try {
    const response = await fetch('https://meetmatt.xyz/api/payment/hyperevm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPayment();
