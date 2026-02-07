// Test Devin API authentication

const TESTS = [
  {
    name: "Personal API Key - v1/sessions",
    url: "https://api.devin.ai/v1/sessions",
    token: process.env.DEVIN_API_KEY,
  },
  {
    name: "Service User - v1/sessions", 
    url: "https://api.devin.ai/v1/sessions",
    token: process.env.DEVIN_SERVICE_USER_TOKEN,
  },
  {
    name: "Personal API Key - v1/session",
    url: "https://api.devin.ai/v1/session",
    token: process.env.DEVIN_API_KEY,
  },
];

async function testAuth({ name, url, token }) {
  if (!token) {
    console.log(`❌ ${name}: No token provided`);
    return;
  }
  
  console.log(`\nTesting: ${name}`);
  console.log(`Token prefix: ${token.substring(0, 20)}...`);
  
  try {
    // Test GET (list sessions)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS:`, JSON.stringify(data, null, 2).substring(0, 200));
    } else {
      const error = await response.text();
      console.log(`❌ ERROR: ${error}`);
    }
  } catch (err) {
    console.log(`❌ EXCEPTION: ${err.message}`);
  }
}

async function main() {
  console.log("=== Devin API Authentication Test ===\n");
  console.log("Environment variables:");
  console.log(`DEVIN_API_KEY: ${process.env.DEVIN_API_KEY ? "set" : "not set"}`);
  console.log(`DEVIN_SERVICE_USER_TOKEN: ${process.env.DEVIN_SERVICE_USER_TOKEN ? "set" : "not set"}`);
  
  for (const test of TESTS) {
    await testAuth(test);
  }
}

main();
