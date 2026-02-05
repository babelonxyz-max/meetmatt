# Testing Devin Integration

Quick guide to verify Devin AI is working properly.

---

## Method 1: End-to-End Test (Recommended)

### Step 1: Complete the Wizard
1. Go to https://meetmatt.vercel.app
2. Click "Initialize deployment"
3. Enter agent name (e.g., "TestBot")
4. Select use case (e.g., "AI Assistant")
5. Select scope options (e.g., "Schedule management")
6. Select "Telegram" as contact method
7. Click "Proceed to payment"

### Step 2: Make Test Payment
1. Click "Proceed to payment"
2. Select a cryptocurrency (USDT recommended)
3. Click "PROCEED TO PAYMENT"
4. Copy the payment address
5. Send a small amount ($1-2 worth) to test
6. Wait for confirmation (5-30 seconds in demo mode)

### Step 3: Check Deployment
After payment confirms:
- Message should say "Initializing deployment..."
- After 30-60 seconds: "🎉 [AgentName] is now live!"
- You should see a Devin session URL

---

## Method 2: Check Vercel Logs

```bash
# View live logs
cd meetmatt && npx vercel logs --production

# Or check in browser:
# https://vercel.com/dashboard → meetmatt → View Logs
```

Look for these messages:
```
✓ Creating Devin session for "TestBot"
✓ Devin session created: devin-sess-xxx
✓ Agent deployment status: running
✓ Agent deployment status: completed
```

---

## Method 3: Check Database

If you have database access:

```sql
-- Check latest agent
SELECT name, status, devinSessionId, devinUrl, createdAt 
FROM Agent 
ORDER BY createdAt DESC 
LIMIT 5;
```

Expected results:
- `status`: "active" (success) or "error" (failed)
- `devinSessionId`: Should have a value like "devin-sess-xxx"
- `devinUrl`: Should have a URL like "https://preview.devin.ai/devin/xxx"

---

## Method 4: Check Devin Dashboard

1. Go to https://preview.devin.ai/sessions
2. Look for new sessions created by your deployments
3. Click on a session to see build progress
4. Check if builds complete successfully

---

## Method 5: API Test

Test the Devin API directly:

```bash
# Replace with your actual key
curl -H "Authorization: Bearer cog_anhxbuztiihzb3nokbaxswshrq3qo7qv76xacel622zqbdwm5z7a" \
  https://api.devin.ai/v1/sessions
```

If working, you'll see a list of sessions.

---

## What to Look For

### ✅ Working Correctly:
- Payment modal appears
- Payment processes successfully
- "Initializing deployment..." message
- Agent status changes to "active"
- Devin session URL in database
- New session appears in Devin dashboard

### ❌ Not Working:
- "Failed to create Devin session" error in logs
- Agent stuck on "pending" status
- No Devin session ID in database
- "Mock session" messages in logs (means key not loaded)

---

## Troubleshooting

### Issue: Still using mock sessions
**Check:** Environment variable not loaded
```bash
npx vercel env ls
```
Should show `DEVIN_API_KEY`

### Issue: "Failed to create Devin session"
**Check:** API key is valid
```bash
curl -H "Authorization: Bearer YOUR_KEY" https://api.devin.ai/v1/sessions
```

### Issue: Deployment stuck on "deploying"
**Check:** Devin dashboard for build errors
- Go to https://preview.devin.ai/sessions
- Find your session
- Check build logs

### Issue: Payment succeeds but no deployment
**Check:** API route logs in Vercel
- Look for errors in `/api/agents` route
- Check if `createDevinSession` is called

---

## Quick Debug Checklist

- [ ] Environment variable set in Vercel
- [ ] API key starts with `cog_` (correct format)
- [ ] Redeployed after adding env var
- [ ] Payment completes successfully
- [ ] Check Vercel logs for errors
- [ ] Check Devin dashboard for sessions

---

## Need Help?

If Devin integration isn't working:
1. Check Vercel logs first
2. Test API key with curl
3. Check Devin dashboard
4. Verify env variable is set
