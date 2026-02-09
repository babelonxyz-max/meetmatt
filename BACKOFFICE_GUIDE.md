# MeetMatt Backoffice Guide

## Quick Start

### Access the Admin Panel
1. Go to: https://meetmatt.xyz/control/login
2. Login with:
   - **Username:** `Latamapac`
   - **Password:** `latamapac`

---

## Features

### 1. Dashboard Overview
- See all key metrics at a glance
- Total users, agents, revenue
- Pending payments, failed deployments
- Tier distribution, status breakdown

### 2. User Management

**View Users**
- List of all users with pagination
- Search by email, wallet, or name
- See agent count per user

**User Actions**
- 👁️ **View Details** - See full user profile, agents, payments, activity
- 🚫 **Ban/Unban** - Suspend/restore user access
- 🗑️ **Delete** - Permanently remove user and all data

**User Detail View**
- Profile information
- List of all agents
- Payment history
- Activity log
- Admin notes

### 3. Agent Management

**View Agents**
- All agents with status, tier, owner
- Filter by status if needed

**Agent Actions**
- ✏️ **Edit** - Change name, purpose, tier, status
- ▶️ **Redeploy** - Trigger new Devin deployment
- 🗑️ **Delete** - Remove agent

### 4. Payment Management

**View Payments**
- All payments with amount, status, user
- See pending vs confirmed

**Payment Actions**
- 💰 **Refund** - Mark payment as refunded (for confirmed payments)

### 5. Website Content (CMS)

**Edit Website Text**
- Change hero title/subtitle
- Update CTA buttons
- Edit descriptions
- Add new content sections

**How to Edit**
1. Find the section (e.g., "hero", "pricing")
2. Click the edit (pencil) icon
3. Change the value
4. Press Enter to save

**Add New Content**
- Fill in Section, Key, Value
- Click the + button
- Access via API at `/api/control/content`

### 6. System Settings

**Feature Flags**
- `signup_enabled` - Allow new registrations
- `maintenance_mode` - Show maintenance page
- `waitlist_mode` - Enable waitlist instead of signup
- `devin_integration` - Enable/disable Devin deployments

**Pricing**
- `pricing.monthly` - Monthly price in USD
- `pricing.annual` - Annual price in USD
- `pricing.annual_discount_percent` - Discount percentage

**Website Settings**
- `website.title` - Page title
- `website.description` - Meta description
- `website.hero_title` - Main headline
- `website.cta_primary` - Main button text

---

## Common Tasks

### Ban a User
1. Go to **Users** tab
2. Find the user
3. Click the 🚫 icon
4. User can no longer login

### Redeploy a Failed Agent
1. Go to **Agents** tab
2. Find the failed agent
3. Click the ▶️ (play) icon
4. Confirm redeployment

### Process a Refund
1. Go to **Payments** tab
2. Find the confirmed payment
3. Click **Refund** button
4. Payment status changes to "refunded"

### Change Website Hero Text
1. Go to **Website Content** tab
2. Find "hero" section
3. Edit "title" or "subtitle"
4. Press Enter to save
5. Changes appear immediately on site

### Enable Maintenance Mode
1. Go to **Settings** tab
2. Find `features.maintenance_mode`
3. Toggle to "true"
4. Site shows maintenance page

---

## API Endpoints

All admin endpoints require authentication via the control session cookie.

### Users
```
GET    /api/control/users?search=&page=
GET    /api/control/users/[id]
PATCH  /api/control/users/[id]
DELETE /api/control/users/[id]
POST   /api/control/users/[id]/ban
POST   /api/control/users/[id]/note
```

### Agents
```
GET    /api/control/agents?page=
GET    /api/control/agents/[id]
PATCH  /api/control/agents/[id]
DELETE /api/control/agents/[id]
POST   /api/control/agents/[id]/redeploy
```

### Payments
```
GET    /api/control/payments?page=
POST   /api/control/payments/[id]/refund
```

### Content (CMS)
```
GET    /api/control/content
POST   /api/control/content
DELETE /api/control/content?section=&key=
```

### Settings
```
GET    /api/control/settings
POST   /api/control/settings
DELETE /api/control/settings?key=
```

---

## Database Models

### New Tables
- `invoices` - Payment invoices
- `activity_logs` - Audit trail (who did what when)
- `admin_notes` - Notes on users
- `system_settings` - Config key-value store
- `website_content` - CMS content

### Updated Tables
- `users` - Added `isBanned`, `banReason`

---

## Security

- All admin routes check for valid session
- Session stored in `control_session` cookie
- Activity logged for audit trail
- User actions (ban/delete) require confirmation

---

## Troubleshooting

**Can't login?**
- Make sure you're using correct credentials
- Clear cookies and try again
- Check `/api/control/check` returns 200

**Changes not showing?**
- Refresh the page
- Check browser console for errors
- Verify API calls succeed in Network tab

**Database errors?**
- Run `npx prisma db push` to sync schema
- Check DATABASE_URL is correct
- Verify database is accessible

---

## Future Enhancements

- [ ] Email notifications integration
- [ ] CSV exports
- [ ] Analytics charts
- [ ] Bulk actions
- [ ] User impersonation
- [ ] Advanced filters
