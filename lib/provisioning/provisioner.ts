// Main Provisioner - Orchestrates the entire deployment flow
// Creates server, installs OpenClaw, creates Telegram bot, handles verification

import { 
  ProvisioningConfig, 
  ProvisionedInstance, 
  InstanceStatus,
  TIER_LIMITS 
} from "./types";
import { generateBotUsername, generateGatewayBotScript, sanitizeInput } from "./telegram-bot";
import { createVerificationRequest, generateVerificationMessage } from "./verification";

// Environment configuration
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID || "";
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || "";
const TELEGRAM_PHONE = process.env.TELEGRAM_PHONE || "";

// Instance storage (would use database in production)
const instanceStore = new Map<string, ProvisionedInstance>();

/**
 * Main provisioning function - orchestrates the entire deployment
 */
export async function provisionAgent(config: ProvisioningConfig): Promise<ProvisionedInstance> {
  const instanceId = `matt-${config.userId}-${Date.now()}`;
  
  // Sanitize inputs
  const sanitizedConfig: ProvisioningConfig = {
    ...config,
    botName: sanitizeInput(config.botName),
    botUsername: sanitizeInput(config.botUsername) || generateBotUsername(config.botName),
    botDescription: config.botDescription ? sanitizeInput(config.botDescription) : undefined,
  };
  
  // Create initial instance record
  const instance: ProvisionedInstance = {
    instanceId,
    publicIp: "pending",
    status: "provisioning",
    createdAt: new Date(),
  };
  
  instanceStore.set(instanceId, instance);
  
  // Start async provisioning
  provisionAsync(instanceId, sanitizedConfig).catch(error => {
    console.error(`Provisioning failed for ${instanceId}:`, error);
    updateInstanceStatus(instanceId, "terminated");
  });
  
  return instance;
}

/**
 * Async provisioning workflow
 */
async function provisionAsync(instanceId: string, config: ProvisioningConfig): Promise<void> {
  try {
    // Step 1: Create EC2 instance
    console.log(`[${instanceId}] Creating EC2 instance...`);
    updateInstanceStatus(instanceId, "provisioning");
    
    const serverInfo = await createServer(config);
    updateInstance(instanceId, { publicIp: serverInfo.publicIp });
    
    // Step 2: Wait for instance to be ready
    console.log(`[${instanceId}] Waiting for instance to be ready...`);
    await waitForServer(serverInfo.publicIp);
    
    // Step 3: Install OpenClaw
    console.log(`[${instanceId}] Installing OpenClaw...`);
    updateInstanceStatus(instanceId, "installing");
    await installOpenClaw(serverInfo.publicIp, config);
    
    // Step 4: Create Telegram bot
    console.log(`[${instanceId}] Creating Telegram bot...`);
    updateInstanceStatus(instanceId, "configuring");
    const botInfo = await createTelegramBot(serverInfo.publicIp, config);
    updateInstance(instanceId, { 
      botToken: botInfo.token,
      botUsername: botInfo.username 
    });
    
    // Step 5: Configure and start the gateway
    console.log(`[${instanceId}] Configuring gateway...`);
    await configureGateway(serverInfo.publicIp, config, botInfo.token);
    
    // Step 6: Generate verification code
    console.log(`[${instanceId}] Generating verification code...`);
    const verification = createVerificationRequest(instanceId);
    updateInstance(instanceId, { 
      verificationCode: verification.code,
      status: "awaiting_verification"
    });
    
    console.log(`[${instanceId}] Provisioning complete! Awaiting user verification.`);
    
  } catch (error) {
    console.error(`[${instanceId}] Provisioning error:`, error);
    updateInstanceStatus(instanceId, "terminated");
    throw error;
  }
}

/**
 * Create EC2 instance via AWS CLI
 */
async function createServer(config: ProvisioningConfig): Promise<{ instanceId: string; publicIp: string }> {
  // Generate user data script
  const userData = generateUserDataScript(config);
  const userDataBase64 = Buffer.from(userData).toString("base64");
  
  // In production, this would call AWS SDK or CLI
  // For now, return mock data for development
  console.log("[AWS] Would create instance with user data script");
  
  // Simulate instance creation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    instanceId: `i-${Date.now().toString(16)}`,
    publicIp: "0.0.0.0", // Would be real IP from AWS
  };
}

/**
 * Wait for server to be ready for SSH
 */
async function waitForServer(ip: string): Promise<void> {
  // In production, would poll SSH port or use AWS instance status checks
  console.log(`[Server] Waiting for ${ip} to be ready...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Install OpenClaw on the server
 */
async function installOpenClaw(ip: string, config: ProvisioningConfig): Promise<void> {
  // In production, would SSH into server and run installation
  console.log(`[OpenClaw] Installing on ${ip}...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Create Telegram bot via BotFather
 */
async function createTelegramBot(
  ip: string, 
  config: ProvisioningConfig
): Promise<{ token: string; username: string }> {
  // In production, would use Telethon on the server to create bot
  console.log(`[Telegram] Creating bot ${config.botUsername}...`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    token: `mock-token-${Date.now()}`,
    username: config.botUsername,
  };
}

/**
 * Configure the OpenClaw gateway with the bot token
 */
async function configureGateway(
  ip: string, 
  config: ProvisioningConfig,
  botToken: string
): Promise<void> {
  // In production, would SSH and configure the gateway
  console.log(`[Gateway] Configuring on ${ip}...`);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Generate the user data script for EC2 instance
 */
function generateUserDataScript(config: ProvisioningConfig): string {
  const limits = TIER_LIMITS[config.tier];
  
  return `#!/bin/bash
set -e
exec > >(tee /var/log/meetmatt-setup.log) 2>&1

echo "=== Meet Matt OpenClaw Setup ==="
echo "Bot: ${config.botName}"
echo "Tier: ${config.tier}"
echo "Started: $(date)"

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python and Telethon
apt-get install -y python3 python3-pip
pip3 install telethon requests

# Create directories
mkdir -p /home/ubuntu/.openclaw
mkdir -p /home/ubuntu/bot-data
mkdir -p /home/ubuntu/.npm-global
npm config set prefix '/home/ubuntu/.npm-global'
export PATH=/home/ubuntu/.npm-global/bin:$PATH

# Install OpenClaw
npm install -g openclaw@latest

# Configure OpenClaw with K2.5
cat > /home/ubuntu/.openclaw/config.json << 'EOF'
{
  "provider": "kimi-coding",
  "model": "k2p5"
}
EOF

# Create rate limits config
cat > /home/ubuntu/bot-data/limits.json << 'EOF'
{
  "messagesPerDay": ${limits.messagesPerDay},
  "maxContextTokens": ${limits.maxContextTokens},
  "maxResponseTokens": ${limits.maxResponseTokens},
  "responseTimeoutMs": ${limits.responseTimeoutMs},
  "tier": "${config.tier}"
}
EOF

# Create bot config
cat > /home/ubuntu/bot-data/config.json << 'EOF'
{
  "botName": "${config.botName}",
  "botUsername": "${config.botUsername}",
  "package": "${config.package}",
  "features": ${JSON.stringify(config.features)},
  "createdAt": "$(date -Iseconds)"
}
EOF

# Set permissions
chown -R ubuntu:ubuntu /home/ubuntu

echo "SETUP_COMPLETE"
echo "Completed: $(date)"
`;
}

/**
 * Update instance status
 */
function updateInstanceStatus(instanceId: string, status: InstanceStatus): void {
  const instance = instanceStore.get(instanceId);
  if (instance) {
    instance.status = status;
    instanceStore.set(instanceId, instance);
  }
}

/**
 * Update instance with partial data
 */
function updateInstance(instanceId: string, updates: Partial<ProvisionedInstance>): void {
  const instance = instanceStore.get(instanceId);
  if (instance) {
    Object.assign(instance, updates);
    instanceStore.set(instanceId, instance);
  }
}

/**
 * Get instance by ID
 */
export function getInstance(instanceId: string): ProvisionedInstance | undefined {
  return instanceStore.get(instanceId);
}

/**
 * Get all instances for a user
 */
export function getUserInstances(userId: string): ProvisionedInstance[] {
  const instances: ProvisionedInstance[] = [];
  for (const [id, instance] of instanceStore) {
    if (id.includes(userId)) {
      instances.push(instance);
    }
  }
  return instances;
}

/**
 * Activate instance after verification
 */
export function activateInstance(instanceId: string, ownerId: number): boolean {
  const instance = instanceStore.get(instanceId);
  if (!instance || instance.status !== "awaiting_verification") {
    return false;
  }
  
  instance.status = "active";
  instanceStore.set(instanceId, instance);
  
  // In production, would also:
  // 1. Update database
  // 2. Start the bot process on the server
  // 3. Send confirmation to user
  
  return true;
}

/**
 * Terminate an instance
 */
export async function terminateInstance(instanceId: string): Promise<boolean> {
  const instance = instanceStore.get(instanceId);
  if (!instance) {
    return false;
  }
  
  // In production, would:
  // 1. Stop the bot process
  // 2. Terminate EC2 instance
  // 3. Clean up resources
  
  instance.status = "terminated";
  instanceStore.set(instanceId, instance);
  
  return true;
}
