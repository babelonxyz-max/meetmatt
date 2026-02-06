// BitLaunch Provider for Meet Matt Provisioning
// Uses BitLaunch API to create and manage VPS instances with crypto payments

import { 
  CloudProvider, 
  ProvisioningConfig, 
  ProvisionedInstance, 
  InstanceStatus,
  DEFAULT_LIMITS 
} from "./types";

const BITLAUNCH_API_URL = "https://app.bitlaunch.io/api";
const BITLAUNCH_API_KEY = process.env.BITLAUNCH_API_KEY || "";

// BitLaunch host IDs
const BITLAUNCH_HOSTS = {
  bitlaunch: 4,
  digitalocean: 0,
  vultr: 1,
  linode: 2,
} as const;

type BitLaunchHost = keyof typeof BITLAUNCH_HOSTS;

// BitLaunch size configurations (from API)
// Using BitLaunch native hosting (host ID 4)
const BITLAUNCH_SIZES = {
  small: {
    id: "nibble-1024",
    memory: 1024,
    cpu: 1,
    disk: 25,
    costPerMonth: 11,
  },
  medium: {
    id: "nibble-2048",
    memory: 2048,
    cpu: 2,
    disk: 50,
    costPerMonth: 22,
  },
  large: {
    id: "nibble-4096",
    memory: 4096,
    cpu: 2,
    disk: 100,
    costPerMonth: 44,
  },
  xlarge: {
    id: "nibble-8192",
    memory: 8192,
    cpu: 4,
    disk: 150,
    costPerMonth: 88,
  },
} as const;

type BitLaunchSize = keyof typeof BITLAUNCH_SIZES;

// BitLaunch regions
const BITLAUNCH_REGIONS = {
  amsterdam: { id: 0, subregion: "ams3" },
  bucharest: { id: 1, subregion: "buc1" },
  london: { id: 2, subregion: "lon1" },
  losangeles: { id: 3, subregion: "lax1" },
  chicago: { id: 4, subregion: "chi1" },
  dallas: { id: 5, subregion: "dal1" },
} as const;

type BitLaunchRegion = keyof typeof BITLAUNCH_REGIONS;

// Ubuntu 24.04 LTS image
const UBUNTU_IMAGE = {
  id: 0,
  versionId: "10006",
  name: "Ubuntu 24.04 LTS",
};

interface BitLaunchServer {
  id: string;
  name: string;
  status: string;
  ipv4: string;
  created: string;
  hostID: number;
  regionID: number;
  sizeSlug: string;
}

interface BitLaunchCreateOptions {
  hostID: number;
  name: string;
  regionID: number;
  subregion: string;
  imageID: number;
  imageVersion: string;
  sizeSlug: string;
  sshKeys?: string[];
  initScript?: string;
  password?: string;
}

interface BitLaunchAPIResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export class BitLaunchProvider implements CloudProvider {
  name = "bitlaunch";
  private host: BitLaunchHost;
  private region: BitLaunchRegion;
  private size: BitLaunchSize;
  
  constructor(
    host: BitLaunchHost = "bitlaunch",
    region: BitLaunchRegion = "dallas",
    size: BitLaunchSize = "medium"
  ) {
    this.host = host;
    this.region = region;
    this.size = size;
  }
  
  private async makeRequest<T>(
    endpoint: string, 
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: unknown
  ): Promise<T> {
    const url = `${BITLAUNCH_API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${BITLAUNCH_API_KEY}`,
      "Content-Type": "application/json",
    };
    
    const options: RequestInit = {
      method,
      headers,
      redirect: "follow",
    };
    
    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BitLaunch API error: ${response.status} - ${errorText}`);
    }
    
    const text = await response.text();
    if (!text || text === "null") {
      return {} as T;
    }
    
    return JSON.parse(text) as T;
  }
  
  async createInstance(config: ProvisioningConfig): Promise<ProvisionedInstance> {
    const serverName = `meetmatt-${config.botName.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}-${Date.now()}`;
    const regionConfig = BITLAUNCH_REGIONS[this.region];
    const sizeConfig = BITLAUNCH_SIZES[this.size];
    
    // Generate user data script for OpenClaw setup
    const initScript = this.generateUserDataScript(config);
    
    const createOptions: BitLaunchCreateOptions = {
      hostID: BITLAUNCH_HOSTS[this.host],
      name: serverName,
      regionID: regionConfig.id,
      subregion: regionConfig.subregion,
      imageID: UBUNTU_IMAGE.id,
      imageVersion: UBUNTU_IMAGE.versionId,
      sizeSlug: sizeConfig.id,
      initScript: initScript,
    };
    
    try {
      const response = await this.makeRequest<BitLaunchServer>("/servers", "POST", createOptions);
      
      return {
        instanceId: response.id || serverName,
        publicIp: response.ipv4 || "pending",
        status: this.mapStatus(response.status || "provisioning"),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error("BitLaunch create instance error:", error);
      throw error;
    }
  }
  
  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    try {
      const server = await this.makeRequest<BitLaunchServer>(`/servers/${instanceId}`);
      return this.mapStatus(server.status);
    } catch {
      return "error";
    }
  }
  
  async terminateInstance(instanceId: string): Promise<void> {
    await this.makeRequest(`/servers/${instanceId}`, "DELETE");
  }
  
  async executeCommand(instanceId: string, command: string): Promise<string> {
    // BitLaunch doesn't have built-in command execution
    // Would need to SSH into the instance
    console.warn("BitLaunch executeCommand not implemented - use SSH");
    return "";
  }
  
  async listServers(): Promise<BitLaunchServer[]> {
    const response = await this.makeRequest<BitLaunchServer[]>("/servers");
    return response || [];
  }
  
  async getServer(instanceId: string): Promise<BitLaunchServer | null> {
    try {
      return await this.makeRequest<BitLaunchServer>(`/servers/${instanceId}`);
    } catch {
      return null;
    }
  }
  
  async getCreateOptions(host: BitLaunchHost = "bitlaunch"): Promise<unknown> {
    const hostId = BITLAUNCH_HOSTS[host];
    return this.makeRequest(`/hosts-create-options/${hostId}`);
  }
  
  async getSSHKeys(): Promise<{ keys: Array<{ id: string; name: string; fingerprint: string }> }> {
    return this.makeRequest("/ssh-keys");
  }
  
  async addSSHKey(name: string, publicKey: string): Promise<{ id: string }> {
    return this.makeRequest("/ssh-keys", "POST", { name, content: publicKey });
  }
  
  private mapStatus(bitlaunchStatus: string): InstanceStatus {
    const statusMap: Record<string, InstanceStatus> = {
      "new": "provisioning",
      "active": "running",
      "off": "stopped",
      "archive": "terminated",
      "error": "error",
    };
    return statusMap[bitlaunchStatus.toLowerCase()] || "provisioning";
  }
  
  private generateUserDataScript(config: ProvisioningConfig): string {
    const limits = DEFAULT_LIMITS;
    
    return `#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/meetmatt-setup.log) 2>&1

echo "=== Meet Matt OpenClaw Setup (BitLaunch) ==="
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
chown -R ubuntu:ubuntu /home/ubuntu/.openclaw /home/ubuntu/bot-data

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

# Set permissions
chown -R ubuntu:ubuntu /home/ubuntu

# Signal completion
echo "SETUP_COMPLETE" > /home/ubuntu/bot-data/status
echo "Completed at: $(date)"
`;
  }
}

// Helper functions for direct API usage
export async function listBitLaunchServers(): Promise<BitLaunchServer[]> {
  const provider = new BitLaunchProvider();
  return provider.listServers();
}

export async function createBitLaunchInstance(
  config: ProvisioningConfig,
  options?: {
    host?: BitLaunchHost;
    region?: BitLaunchRegion;
    size?: BitLaunchSize;
  }
): Promise<ProvisionedInstance> {
  const provider = new BitLaunchProvider(
    options?.host || "bitlaunch",
    options?.region || "dallas",
    options?.size || "medium"
  );
  return provider.createInstance(config);
}

export async function terminateBitLaunchInstance(instanceId: string): Promise<void> {
  const provider = new BitLaunchProvider();
  return provider.terminateInstance(instanceId);
}

export async function getBitLaunchCreateOptions(host: BitLaunchHost = "bitlaunch"): Promise<unknown> {
  const provider = new BitLaunchProvider();
  return provider.getCreateOptions(host);
}

// Export types and constants for external use
export { 
  BITLAUNCH_HOSTS, 
  BITLAUNCH_SIZES, 
  BITLAUNCH_REGIONS,
  type BitLaunchHost,
  type BitLaunchSize,
  type BitLaunchRegion,
  type BitLaunchServer,
};
