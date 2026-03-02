#!/bin/bash

# Fleet Mode - Visual Deployment Script
# Deploys the UI without requiring Redis/Contabo infrastructure

echo "🚀 Fleet Mode Visual Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this from the meetmatt directory.${NC}"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

echo "🚀 Ready to deploy!"
echo ""
echo "Choose deployment method:"
echo "1. Vercel CLI"
echo "2. Git push (auto-deploy)"
echo "3. Manual upload"
echo ""

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "Deploying with Vercel CLI..."
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        vercel --prod
        ;;
    2)
        echo "Pushing to git..."
        git add .
        git commit -m "feat: fleet mode visual deployment"
        git push origin main
        echo -e "${GREEN}Pushed! Check your deployment dashboard.${NC}"
        ;;
    3)
        echo "Build output is in the '.next' folder."
        echo "Upload this folder to your hosting provider."
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Build is ready in .next folder.${NC}"
        ;;
esac

echo ""
echo "📋 Post-Deployment Checklist:"
echo "  ☐ Visit https://your-domain.com/fleet"
echo "  ☐ Verify Fleet link in navbar"
echo "  ☐ Check demo data loads correctly"
echo "  ☐ Test create fleet flow (visual only)"
echo ""
echo "🔧 To enable full functionality:"
echo "  1. Set up Redis (Upstash/Railway)"
echo "  2. Add OPENCLAW_GATEWAY_URL to env"
echo "  3. Replace mock API files with real implementations"
echo "  4. Optional: Add Contabo credentials for auto-provisioning"
echo ""
echo -e "${GREEN}Done!${NC}"
