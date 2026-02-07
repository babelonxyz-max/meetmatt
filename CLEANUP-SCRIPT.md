# Matt V2 - Cleanup Script

## Step 1: Delete Unused Components

```bash
# Navigate to components directory
cd /Users/mark/meetmatt/app/components

# Delete unused components
rm -f \
  JarvisInterface.tsx \
  LaunchWizard.tsx \
  VisualBackground.tsx \
  AnimatedBackground.tsx \
  SkipLink.tsx \
  FocusTrap.tsx \
  KeyboardShortcuts.tsx \
  ScrollProgress.tsx \
  PageTransition.tsx \
  ScrollToBottom.tsx \
  DeploymentProgress.tsx \
  Confetti.tsx \
  CopyButton.tsx \
  Badge.tsx \
  EmptyState.tsx \
  Skeleton.tsx \
  Tooltip.tsx \
  ThemeToggle.tsx \
  LoadingSpinner.tsx

# Keep these (used):
# AIOrb.tsx, PaymentModal.tsx, Navbar.tsx, Footer.tsx
# ErrorBoundary.tsx, Toast.tsx
```

## Step 2: Delete Unused API Routes

```bash
cd /Users/mark/meetmatt/app/api

# Delete unused routes
rm -rf \
  provision/ \
  seed/ \
  test/ \
  deploy-for-user/ \
  check-pool/ \
  track-local/ \
  admin/test-devin/ \
  admin/devin-debug/ \
  admin/create-devin-session/ \
  admin/analytics/ \
  admin/check/ \
  admin/wallet-pool/

# Keep:
# agents/, auth/, payment/, user/, verify/
# deploy-and-notify/ (merge into agents)
# monitor/ (optional, for debugging)
```

## Step 3: Delete Library Dead Code

```bash
cd /Users/mark/meetmatt/lib

# Delete unused
rm -rf provisioning/
rm -f walletPool.ts
rm -f crypto-payment.ts

# Clean up nowpayments.ts - keep only types
# Clean up devin.ts - remove fallback, make Devin required

# Keep:
# prisma.ts, devin.ts, audio.ts, session.ts, tracking.ts
```

## Step 4: Delete Services

```bash
rm -rf /Users/mark/meetmatt/services
```

## Step 5: Consolidate Deploy Endpoint

Merge these into `/api/agents/route.ts`:
- `/api/deploy-for-user/route.ts`
- `/api/deploy-and-notify/route.ts`

Remove duplicates.

## Step 6: Security Cleanup

```bash
# Remove hardcoded tokens from:
# - /api/admin/*/route.ts files
# - lib/devin.ts
# - Any other files with "hardcoded" or "TODO: move to env"
```

## Step 7: Update Imports

After deletion, run:
```bash
cd /Users/mark/meetmatt
npm run build
```

Fix any broken imports.

## Step 8: Database Migration

```bash
# Remove unused tables
npx prisma migrate dev --name cleanup_unused_tables
```

## Verification

```bash
# Check bundle size before/after
npm run build

# Should see:
# - Reduced bundle size (~30-40%)
# - No build errors
# - All tests pass (if any)
```

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Files | ~120 | ~80 |
| Lines of Code | ~15,000 | ~9,000 |
| Components | 27 | 9 |
| API Routes | 29 | 12 |
| Build Time | ~60s | ~40s |
| Bundle Size | Large | Medium |

---

**Execute this script carefully!** Make a backup first.
