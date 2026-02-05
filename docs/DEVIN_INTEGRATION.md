# Devin AI Integration

**Status:** Connected  
**Last Updated:** 2026-02-05

---

## Overview

Meet Matt is now connected to Devin AI for automated agent deployment. When users complete the chat wizard and make payment, Devin automatically builds and deploys their AI agent.

---

## How It Works

### 1. User Flow
1. User completes chat wizard (name → use case → scope → contact method)
2. User proceeds to payment ($150)
3. Payment confirmed → Devin session created
4. Devin builds the agent based on specifications
5. Agent deployed and accessible via Telegram

### 2. Technical Flow
```
User Payment → API Route → Devin API → Build Session → Agent Deployed
                    ↓              ↓
               Database      Status Polling
```

---

## Configuration

### Required Environment Variable
```env
DEVIN_API_KEY="devin_your_api_key_here"
```

### Get Your API Key
1. Visit: https://preview.devin.ai/settings
2. Navigate to "API Keys" section
3. Click "Generate New Key"
4. Copy the key (format: `devin_...`)
5. Add to your `.env.local` file

---

## Devin Prompt Template

The system sends this prompt to Devin for each deployment:

```
Create an AI agent named "{name}" with the following specifications:

**Use Case:** {useCase}
**Scope:** {scope}
**Contact Method:** {contactMethod}

Please:
1. Set up the project structure
2. Implement the core functionality for: {scope}
3. Add {contactMethod} integration for communication
4. Create documentation
5. Deploy to a working endpoint

The agent should be production-ready and handle the described use case effectively.
```

---

## API Methods

### `createDevinSession(config)`
Creates a new Devin session for agent deployment.

```typescript
const session = await createDevinSession({
  name: "MyAssistant",
  useCase: "assistant",
  scope: "Schedule management, Email handling",
  contactMethod: "telegram"
});
// Returns: { sessionId, url, status }
```

### `getSessionStatus(sessionId)`
Checks the current status of a Devin session.

```typescript
const status = await getSessionStatus(sessionId);
// Returns: { sessionId, url, status: "pending" | "running" | "completed" | "error" }
```

### `pollForCompletion(sessionId, callback)`
Polls Devin until deployment completes or fails.

```typescript
await pollForCompletion(sessionId, (status) => {
  console.log("Deployment status:", status);
});
```

---

## Without Devin API Key (Demo Mode)

If `DEVIN_API_KEY` is not set:
- Mock sessions are created
- Simulated deployment progress
- Auto-completes after random delay
- Perfect for UI testing

---

## Monitoring Deployments

### Database Status
Check agent status in database:
```sql
SELECT name, status, devinUrl, createdAt 
FROM Agent 
ORDER BY createdAt DESC;
```

### Devin Dashboard
View active sessions: https://preview.devin.ai/sessions

---

## Troubleshooting

### Issue: "Failed to create Devin session"
- Check API key is valid
- Verify key starts with `devin_`
- Check Devin account has available credits

### Issue: Deployment stuck on "deploying"
- Devin may take 5-30 minutes to build
- Check Devin dashboard for session status
- Review build logs in Devin UI

### Issue: Mock sessions always complete immediately
- This is expected behavior without API key
- Set `DEVIN_API_KEY` for real deployments

---

## Cost Considerations

- Each agent deployment = 1 Devin session
- Check current pricing: https://preview.devin.ai/pricing
- Monitor usage in Devin dashboard
- Set up billing alerts

---

## Future Enhancements

- [ ] Real-time deployment logs
- [ ] Deployment progress bar
- [ ] Cancel deployment button
- [ ] Retry failed deployments
- [ ] Multi-region deployment
- [ ] Custom Devin prompts per use case

---

## Production Checklist

Before going live:
- [ ] Valid Devin API key configured
- [ ] Devin account has payment method
- [ ] Test deployment end-to-end
- [ ] Monitor first few deployments
- [ ] Set up error alerting
