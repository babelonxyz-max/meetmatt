# Fleet Mode - Visual Deployment

Deploy the Fleet Mode UI **without** setting up Redis, Contabo, or OpenClaw infrastructure.

## What's Included

✅ **Working UI:**
- Fleet dashboard with mock data
- Create fleet wizard
- Fleet detail pages
- Navbar & footer links
- Demo banner showing "Visual Preview Mode"

❌ **Not Included (Backend):**
- Real agent deployment
- Redis queue processing
- Contabo auto-provisioning
- OpenClaw runtime

## Quick Deploy

### Option 1: Vercel (Recommended)

```bash
cd meetmatt

# Install dependencies
npm install

# Build
npm run build

# Deploy
vercel --prod
```

### Option 2: Git Push

```bash
git add .
git commit -m "feat: fleet mode visual preview"
git push origin main
```

Vercel will auto-deploy from your git push.

### Option 3: Use Deploy Script

```bash
./deploy-visual.sh
```

## Environment Variables

For **visual-only** deployment, you don't need any special env vars. The API routes return mock data.

```bash
# .env.local (minimal for visual mode)
# Leave everything empty or use defaults
```

## What Users Will See

1. **Navbar:** "Fleet" link visible
2. **Homepage:** "New: Fleet Mode" CTA banner
3. **Fleet Dashboard:** Demo fleet with 50 mock agents
4. **Create Fleet:** Full wizard (creates mock data)
5. **Demo Banner:** "Visual Preview Mode - Backend infrastructure coming soon"

## Demo Data

The mock API returns:
- 1 demo fleet: "Demo Support Fleet"
- 50 mock agents (45 running, 3 pending, 2 error)
- Real-time progress updates (simulated)

## Enabling Full Functionality

After visual deployment, to enable real agent deployment:

### Step 1: Set up Redis
```bash
# Option A: Upstash (free serverless Redis)
# Sign up at https://upstash.com/
# Get Redis URL and add to env:
REDIS_URL=rediss://xxx@xxx.upstash.io:6379
```

### Step 2: Set up OpenClaw
```bash
# Install OpenClaw on a server
# Add to env:
OPENCLAW_GATEWAY_URL=http://your-server:18789
OPENCLAW_AUTH_TOKEN=your-token
```

### Step 3: Replace API Routes
Replace the mock API files with the full implementations:

```bash
# Backup mock files
mv app/api/fleet/route.ts app/api/fleet/route.mock.ts
mv app/api/fleet/[id]/route.ts app/api/fleet/[id]/route.mock.ts
# ... etc

# Restore full implementations from git
# (or copy from the original files in lib/fleet/)
```

### Step 4: Optional - Add Contabo
For auto-provisioning:
```bash
# Get API credentials from https://my.contabo.com/
ENABLE_AUTO_PROVISIONING=true
CONTABO_CLIENT_ID=xxx
CONTABO_CLIENT_SECRET=xxx
CONTABO_API_USER=xxx
CONTABO_API_PASSWORD=xxx
```

## Testing the Visual Deployment

1. Visit `https://your-domain.com/fleet`
2. You should see the Fleet dashboard
3. Click "New Fleet" - wizard should work
4. Create a fleet - it will show in the list
5. Click on a fleet - detail page should load

## Troubleshooting

### Build fails
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### 404 on /fleet
- Check that `app/fleet/page.tsx` exists
- Ensure Next.js config supports app router

### Styles not loading
- Check that Tailwind is configured
- Verify CSS variables in globals.css

## Support

For issues with the visual deployment, check:
1. Next.js build output (`npm run build`)
2. Vercel deployment logs
3. Browser console for errors

For enabling full functionality, see `FLEET_MODE.md` and `INFRASTRUCTURE.md`.
