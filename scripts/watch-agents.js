// Watch for new agents and notify Devin
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEVIN_API_KEY = 'apk_user_ZW1haWx8Njk3N2U1NDg2ODE4NGFiNzA4MWM0MTE1X29yZy04NzRkYzAzMGQyOTI0Mjc1YmI2ZGIzYWU2NzdhYmQ0Nzo3NTQ0YTkxZDM2OWE0NjY3OTY3MmNlYWRlNDVjOWMxYg==';

async function checkNewAgents() {
  const recentAgents = await prisma.agent.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60000) // Last 60 seconds
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const agent of recentAgents) {
    console.log(`\n🆕 New agent detected: ${agent.name} (${agent.id})`);
    console.log(`   Status: ${agent.status}`);
    console.log(`   Devin Session: ${agent.devinSessionId || 'Not created yet'}`);
    
    if (agent.devinSessionId) {
      // Send info to Devin
      const message = `New agent request from MeetMatt:
- Name: ${agent.name}
- Purpose: ${agent.purpose}
- Type: ${agent.type}
- Features: ${agent.features?.join(', ')}
- User ID: ${agent.userId}`;
      
      try {
        const res = await fetch(`https://api.devin.ai/v1/sessions/${agent.devinSessionId}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DEVIN_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message })
        });
        
        if (res.ok) {
          console.log(`   ✅ Info sent to Devin!`);
        } else {
          console.log(`   ❌ Failed to send: ${res.status}`);
        }
      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
      }
    }
  }
}

console.log('👀 Watching for new agents... (Press Ctrl+C to stop)');
checkNewAgents();
setInterval(checkNewAgents, 10000); // Check every 10 seconds
