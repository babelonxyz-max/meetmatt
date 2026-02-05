# Chat Flow V3 Documentation

**Version:** 3.0  
**Last Updated:** 2026-02-05  
**Status:** Production Ready

---

## Overview

New streamlined chat wizard with real-life oriented options and cleaner UX flow.

---

## Flow Steps

### 1. **Intro**
- Welcome message
- "Start creating" button

### 2. **Name**
- Question: "What should be the name of your agent?"
- Single text input
- Continue button

### 3. **Use Case** (NEW)
Question: "What's the use case for [name]?"

Options (card style):
- 🤖 **AI Assistant** - Personal helper for daily tasks
- 👥 **Coworker** - Team member for collaboration  
- 💼 **Digital Employee** - Autonomous worker for your business

### 4. **Scope** (NEW - Multi-select)
Question: "What should your agent help with? Select all that apply"

Options vary by use case:

**AI Assistant:**
- 📅 Schedule management
- 📧 Email handling
- 🔍 Research & summaries
- ✍️ Writing & editing
- ⏰ Reminders & tasks

**Coworker:**
- 💡 Brainstorming
- 📄 Document collaboration
- 📝 Meeting notes
- 🎯 Project planning
- 📊 Data analysis

**Digital Employee:**
- 🎧 Customer support
- 🎯 Lead generation
- 📱 Content creation
- 💰 Sales outreach
- ⚙️ Operations

### 5. **Contact Method** (NEW)
Question: "How would you like to contact your agent?"

Options (3-column grid):
- ✈️ **Telegram** (active)
- 💬 **WhatsApp** (soon)
- 💻 **Slack** (soon)

### 6. **Confirm**
Summary with:
- Agent name
- Use case
- Scope (selected items)
- Contact method
- "Proceed to payment" button

### 7. **Payment**
- Opens PaymentModal
- Shows $150 first month
- Crypto payment options

---

## Key Improvements

1. **Real-life oriented** - No more code/technical jargon
2. **Multi-select scope** - Users can select multiple capabilities
3. **Contact integration** - Telegram ready, WhatsApp/Slack coming
4. **Cleaner payment** - No big plan card, just proceed button
5. **Smooth animations** - AnimatePresence for step transitions

---

## Files Modified

- `app/page.tsx` - Main wizard logic
- `app/components/PaymentModal.tsx` - Simplified payment UI
- `app/components/LaunchWizard.tsx` - Updated for new flow
- `lib/session.ts` - New PendingConfig interface
- `app/api/agents/route.ts` - Updated API for new config

---

## Production URL

https://meetmatt.vercel.app
