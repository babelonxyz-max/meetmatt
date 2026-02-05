#!/bin/bash
# GitHub Repository Setup Script for Meet Matt
# This script automates pushing the project to GitHub

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_NAME="meetmatt"
GITHUB_USER="babeloxyz"

echo "=========================================="
echo "  Meet Matt - GitHub Setup"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Git not initialized. Initializing..."
    git init
    git add -A
    git commit -m "Initial commit"
fi

# Check if already has remote
if git remote get-url origin &>/dev/null; then
    echo "📡 Remote already configured:"
    git remote -v
    echo ""
    read -p "Reconfigure remote? (y/n): " RECONFIGURE
    if [[ $RECONFIGURE =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Using existing remote..."
        SKIP_REMOTE=true
    fi
fi

if [ "$SKIP_REMOTE" != "true" ]; then
    # Try SSH first (best practice)
    echo "🔑 Checking SSH key..."
    if [ -f ~/.ssh/id_ed25519.pub ] || [ -f ~/.ssh/id_rsa.pub ]; then
        echo "✅ SSH key found"
        echo ""
        echo "Your SSH public key:"
        cat ~/.ssh/id_ed25519.pub 2>/dev/null || cat ~/.ssh/id_rsa.pub
        echo ""
        echo "⚠️  IMPORTANT: Add this SSH key to GitHub:"
        echo "   https://github.com/settings/keys"
        echo ""
        read -p "Press Enter after adding SSH key to GitHub..."
        
        # Test SSH connection
        echo "Testing SSH connection..."
        ssh -o StrictHostKeyChecking=no -T git@github.com 2>&1 || true
        
        # Add SSH remote
        git remote add origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
        SSH_MODE=true
    else
        echo "⚠️  No SSH key found. Using HTTPS..."
        git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
        SSH_MODE=false
    fi
fi

# Ensure we're on main branch
git branch -M main 2>/dev/null || true

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
if [ "$SSH_MODE" = "true" ]; then
    git push -u origin main
else
    echo "You may be prompted for GitHub credentials."
    echo "Use your GitHub username and a Personal Access Token (not password)"
    echo "Create token: https://github.com/settings/tokens/new (check 'repo')"
    echo ""
    git push -u origin main
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "Repository pushed to:"
    echo "  https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "Next steps:"
    echo "1. Visit the repo: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo "2. Connect Vercel to GitHub for auto-deploys"
    echo "3. Add environment variables in Vercel dashboard"
    echo ""
else
    echo ""
    echo "❌ Push failed. Common fixes:"
    echo ""
    echo "If using SSH:"
    echo "  - Ensure SSH key is added to GitHub"
    echo "  - Test: ssh -T git@github.com"
    echo ""
    echo "If using HTTPS:"
    echo "  - Create Personal Access Token: https://github.com/settings/tokens/new"
    echo "  - Use token as password when prompted"
    echo ""
    echo "If repo doesn't exist:"
    echo "  - Create it first: https://github.com/new"
    echo "  - Name: $REPO_NAME"
    echo "  - Don't initialize with README"
    echo ""
fi
