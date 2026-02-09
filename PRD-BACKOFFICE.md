# MeetMatt Backoffice Module - PRD

## Overview
A comprehensive admin backoffice system for managing the MeetMatt AI agent platform. Built as a modular, reusable system that can be integrated into the main application.

**Goal**: Replace the placeholder CONTROL panel with a full-featured backoffice for:
- User management (CRUD, impersonation, ban/unban)
- Agent management (view, edit, deploy, delete, monitor)
- Payment/Invoice management (view, refund, reconcile)
- Devin deployment monitoring (logs, retry, status)
- Analytics & reporting (revenue, growth, churn)
- System settings (pricing, feature flags, maintenance mode)

---

## Architecture Philosophy

### Modular Design
```
backoffice/
├── components/          # Reusable UI components
│   ├── DataTable/      # Sortable, filterable, paginated table
│   ├── StatCards/      # KPI cards with trends
│   ├── Charts/         # Recharts wrappers
│   ├── Forms/          # Agent edit forms, user forms
│   └── Modals/         # Confirmation, detail modals
├── hooks/              # Data fetching hooks
│   ├── useUsers.ts
│   ├── useAgents.ts
│   ├── usePayments.ts
│   └── useAnalytics.ts
├── services/           # API service layer
│   ├── userService.ts
│   ├── agentService.ts
│   ├── paymentService.ts
│   └── devinService.ts
├── types/              # TypeScript types
├── utils/              # Helpers (formatting, filters)
└── pages/              # Page components
    ├── Dashboard.tsx
    ├── UsersPage.tsx
    ├── AgentsPage.tsx
    ├── PaymentsPage.tsx
    ├── DevinMonitor.tsx
    └── SettingsPage.tsx
```

### Integration Pattern
The backoffice is a self-contained module that mounts at `/control`:
- **Standalone Layout**: Separate from main app layout (no AI Orb, different nav)
- **Shared Database**: Uses same Prisma client
- **Shared Auth**: Uses same Privy auth but with admin role check
- **API Routes**: `/api/control/*` endpoints (already started)

---

## Feature Specifications

### 1. Dashboard Overview

**Stats Cards (real-time)**:
- Total Users (with daily growth %)
- Active Agents (vs pending/failed)
- Monthly Recurring Revenue (MRR)
- Today's New Signups
- Pending Payments
- Failed Deployments (Devin errors)

**Charts**:
- Revenue over time (line chart, 30/90/365 days)
- User signups (bar chart, by day/week/month)
- Agent deployments (stacked: successful/failed/pending)
- Payment status pie chart

**Recent Activity Feed**:
- New user registrations
- Successful payments
- Failed deployments
- Agent status changes

**Alerts Section**:
- Failed Devin deployments (needs attention)
- Expired subscriptions (today)
- Pending payments > 1 hour
- System errors (last 24h)

---

### 2. User Management

**User List View**:
- Table columns: Email, Wallet, Agents Count, Status, Joined Date, Last Login
- Filters: By status (active/banned), by date range, by agent count
- Search: Email, wallet address, Privy ID
- Bulk actions: Export CSV

**User Detail Page**:
- Profile info (email, wallet, Privy ID)
- Agents list (with quick actions)
- Payment history
- Activity log (logins, agent creates, payments)
- Admin actions:
  - Impersonate user (login as them)
  - Ban/unban account
  - Delete account (with confirmation)
  - Add note (internal admin notes)

**User Actions API**:
```typescript
// GET /api/control/users
// GET /api/control/users/[id]
// PATCH /api/control/users/[id] (update user)
// DELETE /api/control/users/[id]
// POST /api/control/users/[id]/impersonate
// POST /api/control/users/[id]/ban
// POST /api/control/users/[id]/note
```

---

### 3. Agent Management

**Agent List View**:
- Table columns: Name, Owner, Status, Tier, Created, Subscription End
- Filters: By status (active/pending/failed), by tier, by subscription status
- Search: Agent name, owner email

**Agent Detail Page**:
- Basic info (name, purpose, tier)
- Owner info (link to user profile)
- Deployment status & history
- Devin session details (if available)
- Subscription details (current period, next billing)
- Bot details (username, Telegram link, auth code)

**Agent Actions**:
- Edit agent (name, purpose, tier)
- Trigger redeploy (restart Devin session)
- Cancel subscription
- Delete agent (with refund option)
- View Devin logs
- Manual verify (bypass Telegram verification)

**Agent Status Monitor**:
- Real-time status indicators
- Deployment progress bar
- Error logs display
- Retry failed deployments

---

### 4. Payment & Invoice Management

**Payment List**:
- Table: ID, User, Amount, Status, Date, Order ID
- Filters: By status, by date range, by amount
- Export: CSV for accounting

**Payment Detail**:
- Full payment info
- User profile link
- Associated agent
- Invoice generation (PDF)
- Refund action (for confirmed payments)

**Invoice System**:
- Generate invoice for any payment
- Invoice template with MeetMatt branding
- Download as PDF
- Email invoice to user

**Reconciliation Tools**:
- Compare NowPayments reports with our DB
- Identify missing payments
- Manual payment entry (for support cases)

**Subscription Management**:
- View all active subscriptions
- Extend/cancel subscriptions
- Bulk renewal processing

---

### 5. Devin Deployment Monitor

**Deployment Queue**:
- Pending deployments
- In-progress (with time elapsed)
- Failed deployments (with error details)
- Recently completed

**Devin Session Viewer**:
- Session ID and URL
- Current status (polling)
- Output logs (from webhook)
- Parsed results (bot username, auth code)
- Raw Devin output

**Devin Actions**:
- Retry failed deployment
- Cancel pending deployment
- View full session on Devin.ai
- Manual status update (if webhook failed)

**Devin Configuration**:
- API key status check
- Webhook URL display
- Test Devin connection

---

### 6. Analytics & Reporting

**Revenue Analytics**:
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Revenue by plan (Matt vs Pro)
- Revenue churn rate
- Lifetime Value (LTV) estimates

**User Analytics**:
- User growth (daily/weekly/monthly)
- Activation rate (signup → agent create)
- Conversion rate (trial → paid)
- Churned users

**Agent Analytics**:
- Agents created over time
- Deployment success rate
- Average deployment time
- Popular use cases

**Exportable Reports**:
- Monthly revenue report
- User growth report
- Agent deployment report
- Custom date range reports

---

### 7. System Settings

**Pricing Configuration**:
- Edit tier prices
- Set promotional discounts
- Configure annual discount %
- A/B test pricing (feature flag)

**Feature Flags**:
- Enable/disable new user signup
- Maintenance mode toggle
- Devin integration on/off
- Waitlist mode

**Email Settings**:
- Configure email provider (Resend/SendGrid)
- Email templates editor
- Test email sending

**Integration Settings**:
- NowPayments API key
- Devin API key
- Privy configuration
- Webhook URLs

**System Health**:
- Database connection status
- External API status (NowPayments, Devin, Privy)
- Recent error logs
- Disk space (if applicable)

---

## UI/UX Specifications

### Design System
- **Framework**: Tailwind CSS (consistent with main app)
- **Components**: Radix UI + Custom components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Theme**: Dark mode only (professional admin aesthetic)

### Color Palette
```css
--background: #0a0a0a
--card: #171717
--card-hover: #262626
--border: #262626
--border-hover: #404040
--accent: #3b82f6 (blue-500)
--accent-hover: #2563eb (blue-600)
--success: #22c55e (green-500)
--warning: #f59e0b (amber-500)
--error: #ef4444 (red-500)
--muted: #a3a3a3 (neutral-400)
```

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  [Logo] CONTROL                    [Alerts] [Profile]   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  Dashboard│  Main Content Area                          │
│  Users   │                                              │
│  Agents  │  • Stats Cards (top)                        │
│  Payments│  • Charts (middle)                          │
│  Devin   │  • Data Tables (bottom)                     │
│  Analytics│                                              │
│  Settings│                                              │
│          │                                              │
│  ────────│                                              │
│  Logout  │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Responsive Behavior
- Desktop: Full sidebar + content
- Tablet: Collapsible sidebar
- Mobile: Bottom nav or hamburger menu

---

## API Endpoints Required

### Users
```
GET    /api/control/users              # List users (paginated)
GET    /api/control/users/[id]         # Get user details
PATCH  /api/control/users/[id]         # Update user
DELETE /api/control/users/[id]         # Delete user
POST   /api/control/users/[id]/ban     # Ban/unban user
POST   /api/control/users/[id]/impersonate  # Get impersonation token
GET    /api/control/users/[id]/activity     # User activity log
```

### Agents
```
GET    /api/control/agents             # List agents (paginated)
GET    /api/control/agents/[id]        # Get agent details
PATCH  /api/control/agents/[id]        # Update agent
DELETE /api/control/agents/[id]        # Delete agent
POST   /api/control/agents/[id]/redeploy    # Trigger redeploy
POST   /api/control/agents/[id]/verify      # Manual verify
GET    /api/control/agents/[id]/logs        # Devin logs
```

### Payments
```
GET    /api/control/payments           # List payments
GET    /api/control/payments/[id]      # Get payment details
POST   /api/control/payments/[id]/refund    # Process refund
GET    /api/control/payments/[id]/invoice   # Generate invoice
POST   /api/control/payments/manual         # Manual payment entry
```

### Analytics
```
GET    /api/control/analytics/overview      # Dashboard stats
GET    /api/control/analytics/revenue       # Revenue data
GET    /api/control/analytics/users         # User growth data
GET    /api/control/analytics/agents        # Agent deployment data
GET    /api/control/analytics/export        # Export report
```

### Devin
```
GET    /api/control/devin/sessions          # List Devin sessions
GET    /api/control/devin/sessions/[id]     # Session details
POST   /api/control/devin/sessions/[id]/retry  # Retry deployment
POST   /api/control/devin/test              # Test Devin API
```

### Settings
```
GET    /api/control/settings          # Get all settings
PATCH  /api/control/settings          # Update settings
GET    /api/control/settings/health   # System health check
```

---

## Database Schema Additions

```prisma
// Admin notes for users
model AdminNote {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  content   String
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("admin_notes")
}

// System settings (key-value store)
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy String?  @map("updated_by")
  
  @@map("system_settings")
}

// Invoice records
model Invoice {
  id          String   @id @default(cuid())
  paymentId   String   @map("payment_id")
  invoiceNumber String @unique @map("invoice_number")
  status      String   @default("draft") // draft, sent, paid
  pdfUrl      String?  @map("pdf_url")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("invoices")
}

// Activity log for audit trail
model ActivityLog {
  id          String   @id @default(cuid())
  action      String   // user_created, payment_confirmed, agent_deployed, etc.
  entityType  String   @map("entity_type") // user, agent, payment
  entityId    String   @map("entity_id")
  actorId     String?  @map("actor_id") // admin who performed action
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("activity_logs")
}
```

---

## Security Requirements

1. **Authentication**:
   - Require Privy auth + admin role check
   - Session timeout after 1 hour
   - IP logging for admin actions

2. **Authorization**:
   - Middleware check on all `/api/control/*` routes
   - Role-based access (admin vs super-admin)

3. **Audit Logging**:
   - Log all create/update/delete actions
   - Include actor, timestamp, before/after values

4. **Data Protection**:
   - Don't expose sensitive user data unnecessarily
   - Mask wallet addresses in lists
   - Encrypt admin notes

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up backoffice module structure
- Create shared components (DataTable, StatCards)
- Implement authentication/authorization
- Build Dashboard overview page

### Phase 2: Core CRUD (Week 2)
- User management (list, view, ban)
- Agent management (list, view, edit, delete)
- Payment management (list, view, refund)

### Phase 3: Advanced Features (Week 3)
- Devin deployment monitor
- Analytics charts
- Invoice generation
- System settings

### Phase 4: Polish (Week 4)
- Export functionality
- Bulk actions
- Search optimization
- Mobile responsiveness
- Testing & bug fixes

---

## Success Metrics

- Admin can complete common tasks in < 3 clicks
- Page load time < 2 seconds
- 100% audit coverage for admin actions
- Zero unauthorized access incidents
- Support ticket resolution time reduced by 50%

---

## Future Enhancements

1. **Multi-tenant**: Support multiple projects
2. **AI Assistant**: AI-powered admin assistant
3. **Mobile App**: Native iOS/Android admin app
4. **Real-time**: WebSocket updates for live data
5. **Automation**: Automated refund/failure handling

---

## Notes for Developer

1. **Reuse existing code**: The current CONTROL panel has good bones - enhance don't replace
2. **Type safety**: Use strict TypeScript throughout
3. **Error handling**: All API calls need proper error boundaries
4. **Loading states**: Every async operation needs visual feedback
5. **Optimistic UI**: Update UI immediately, roll back on error
6. **Testing**: Write tests for critical paths (payments, deployments)

---

**Integration Point**: This backoffice will mount at `/control` and replace the current placeholder implementation. The existing API routes in `/api/control/*` should be extended, not replaced (they already have auth).
