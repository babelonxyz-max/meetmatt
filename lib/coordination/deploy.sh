#!/bin/bash
# Deploy Swarm Coordinator to a server
# Usage: ./deploy.sh <server_ip> <ssh_key_path>

set -e

SERVER_IP="${1:-212.28.180.94}"  # Default to Contabo VPS
SSH_KEY="${2:-/home/ubuntu/.ssh/contabo_vps}"
COORDINATOR_PORT="${3:-3847}"

echo "=== Deploying Swarm Coordinator to $SERVER_IP ==="

# Create coordinator directory on server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$SERVER_IP" << 'SSHEOF'
mkdir -p /opt/swarm-coordinator
cd /opt/swarm-coordinator

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Create package.json
cat > package.json << 'PKGEOF'
{
  "name": "swarm-coordinator",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node handler.js"
  }
}
PKGEOF
SSHEOF

# Copy handler file
echo "Copying coordinator handler..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$(dirname "$0")/openclaw-skill/handler.ts" \
    root@"$SERVER_IP":/opt/swarm-coordinator/handler.ts

# Compile and start on server
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$SERVER_IP" << SSHEOF
cd /opt/swarm-coordinator

# Install TypeScript and compile
npm install -g typescript ts-node 2>/dev/null || true

# Convert to JavaScript (simple transpile)
# For production, use proper build
npx tsc handler.ts --target ES2020 --module NodeNext --moduleResolution NodeNext --outDir . 2>/dev/null || {
    # Fallback: run with ts-node
    echo "Using ts-node..."
}

# Stop existing coordinator
pkill -f "swarm-coordinator" 2>/dev/null || true
pkill -f "handler.js" 2>/dev/null || true
sleep 2

# Start coordinator
export COORDINATOR_PORT=$COORDINATOR_PORT
nohup npx ts-node handler.ts > /var/log/swarm-coordinator.log 2>&1 &

sleep 3
echo ""
echo "=== Coordinator Status ==="
curl -s http://localhost:$COORDINATOR_PORT/health || echo "Failed to start"
SSHEOF

echo ""
echo "=== Deployment Complete ==="
echo "Coordinator URL: http://$SERVER_IP:$COORDINATOR_PORT"
echo "Check status: curl http://$SERVER_IP:$COORDINATOR_PORT/status"
