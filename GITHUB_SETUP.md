# GitHub Setup Guide - Quick 2-Minute Setup

## Option 1: Web Interface (Easiest)

### Step 1: Create Repository
1. Go to: https://github.com/new
2. Fill in:
   - **Repository name:** `meetmatt`
   - **Description:** `Meet Matt - Deploy AI Assistants in Minutes`
   - **Public** or **Private** (your choice)
   - **UNCHECK** "Add a README file"
   - **UNCHECK** "Add .gitignore"
   - **UNCHECK** "Choose a license"
3. Click **"Create repository"**

### Step 2: Push Code
Run these commands in your terminal:

```bash
cd /Users/mark/openclaw-launcher/my-app
git remote add origin https://github.com/babeloxyz/meetmatt.git
git branch -M main
git push -u origin main
```

When prompted for credentials:
- **Username:** `babeloxyz`
- **Password:** Use a Personal Access Token (see below)

### Create Personal Access Token
1. Go to: https://github.com/settings/tokens/new
2. **Note:** "Meet Matt Deploy"
3. **Expiration:** 30 days (or no expiration)
4. **Scopes:** Check `repo` (full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token immediately** (you can't see it again)
7. Use this token as the password when pushing

---

## Option 2: SSH Key (Most Secure)

### Step 1: Get Your SSH Key
```bash
cat ~/.ssh/id_ed25519.pub
```

Output looks like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJGDfWiyFORV4B2/7MTaOgn1i9aEjCCNtDzVgTadH8NW latamapc@gmail.com
```

### Step 2: Add to GitHub
1. Go to: https://github.com/settings/keys
2. Click **"New SSH key"**
3. **Title:** `Meet Matt Deploy Key`
4. **Key type:** Authentication Key
5. **Key:** Paste your public key from Step 1
6. Click **"Add SSH key"**

### Step 3: Create Repository
1. Go to: https://github.com/new
2. Fill in repo details (same as Option 1)
3. Click **"Create repository"**

### Step 4: Push via SSH
```bash
cd /Users/mark/openclaw-launcher/my-app
git remote set-url origin git@github.com:babeloxyz/meetmatt.git
git branch -M main
git push -u origin main
```

---

## Option 3: Use the Setup Script

```bash
cd /Users/mark/openclaw-launcher/my-app
./scripts/setup-github.sh
```

This interactive script will:
1. Show your SSH key
2. Guide you through adding it to GitHub
3. Push the code

---

## Verify Setup

After pushing, verify with:
```bash
git remote -v
# Should show:
# origin  https://github.com/babeloxyz/meetmatt.git (fetch)
# origin  https://github.com/babeloxyz/meetmatt.git (push)
```

Visit: https://github.com/babeloxyz/meetmatt

---

## Next Steps After GitHub Setup

### 1. Connect Vercel to GitHub
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Git**
4. Connect to GitHub repository
5. Enable auto-deploy on push

### 2. Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables:
```
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_APP_URL=https://meetmatt.xyz
```

### 3. Custom Domain (Already Done)
Domain `meetmatt.xyz` should automatically update when you push.

---

## Troubleshooting

### "Repository not found"
- Make sure the repo exists on GitHub
- Check your username: `babeloxyz`

### "Permission denied"
- For HTTPS: Check your Personal Access Token has `repo` scope
- For SSH: Verify key is added to GitHub and SSH agent is running

### "Fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin [YOUR_URL]
```

### Need Help?
- Check AGENTS.md for full project documentation
- Visit: https://github.com/babeloxyz/meetmatt
