// AWS EC2 Provider for Meet Matt Provisioning
// Uses AWS SDK to create and manage EC2 instances

import { 
  CloudProvider, 
  ProvisioningConfig, 
  ProvisionedInstance, 
  InstanceStatus,
  DEFAULT_LIMITS 
} from "./types";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

// Ubuntu 22.04 LTS AMI (us-east-1)
const DEFAULT_AMI = "ami-0c7217cdde317cfec";
const DEFAULT_INSTANCE_TYPE = "t3.small"; // 2 vCPU, 2GB RAM - sufficient for OpenClaw
const DEFAULT_KEY_NAME = "meetmatt-instances";
const DEFAULT_SECURITY_GROUP = "meetmatt-bots";

interface EC2Instance {
  InstanceId: string;
  PublicIpAddress?: string;
  State: { Name: string };
}

export class AWSProvider implements CloudProvider {
  name = "aws";
  
  private async makeEC2Request(action: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`https://ec2.${AWS_REGION}.amazonaws.com/`);
    
    const queryParams = new URLSearchParams({
      Action: action,
      Version: "2016-11-15",
      ...params,
    });
    
    // AWS Signature V4 would be needed here
    // For now, we'll use the AWS CLI approach via shell commands
    throw new Error("Direct API not implemented - use CLI wrapper");
  }
  
  async createInstance(config: ProvisioningConfig): Promise<ProvisionedInstance> {
    const instanceId = `meetmatt-${config.userId}-${Date.now()}`;
    
    // User data script to install OpenClaw
    const userData = this.generateUserDataScript(config);
    const userDataBase64 = Buffer.from(userData).toString("base64");
    
    // For now, return a placeholder - actual creation happens via CLI
    return {
      instanceId,
      publicIp: "pending",
      status: "provisioning",
      createdAt: new Date(),
    };
  }
  
  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    // Would query EC2 DescribeInstances
    return "provisioning";
  }
  
  async terminateInstance(instanceId: string): Promise<void> {
    // Would call EC2 TerminateInstances
  }
  
  async executeCommand(instanceId: string, command: string): Promise<string> {
    // Would use SSM or SSH to execute commands
    return "";
  }
  
  private generateUserDataScript(config: ProvisioningConfig): string {
    const limits = DEFAULT_LIMITS;
    
    return `#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/meetmatt-setup.log) 2>&1

echo "=== Meet Matt OpenClaw Setup ==="
echo "Instance: ${config.botName}"
echo "Started at: $(date)"

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install OpenClaw
npm install -g openclaw@latest

# Create config directory
mkdir -p /home/ubuntu/.openclaw
mkdir -p /home/ubuntu/bot-data

# Configure OpenClaw with K2.5
cat > /home/ubuntu/.openclaw/config.json << 'EOFCONFIG'
{
  "provider": "kimi-coding",
  "model": "k2p5",
  "maxContextTokens": ${limits.maxContextTokens},
  "maxResponseTokens": ${limits.maxResponseTokens},
  "timeoutMs": ${limits.responseTimeoutMs}
}
EOFCONFIG

# Create service limits config
cat > /home/ubuntu/bot-data/limits.json << 'EOFLIMITS'
{
  "maxContextTokens": ${limits.maxContextTokens},
  "maxResponseTokens": ${limits.maxResponseTokens},
  "responseTimeoutMs": ${limits.responseTimeoutMs}
}
EOFLIMITS

# Install Python and Telethon for bot management
apt-get install -y python3 python3-pip
pip3 install telethon

# Signal completion
echo "SETUP_COMPLETE" > /home/ubuntu/bot-data/status
echo "Completed at: $(date)"
`;
  }
}

// CLI-based AWS operations (more reliable than direct API)
export async function createEC2Instance(config: ProvisioningConfig): Promise<{
  instanceId: string;
  publicIp: string;
}> {
  // This would be called from a server-side API route
  // The actual AWS CLI commands would be executed there
  
  const userDataScript = new AWSProvider()["generateUserDataScript"](config);
  
  // Return the script for execution
  return {
    instanceId: `pending-${Date.now()}`,
    publicIp: "pending",
  };
}

export function generateProvisioningScript(config: ProvisioningConfig): string {
  return new AWSProvider()["generateUserDataScript"](config);
}
