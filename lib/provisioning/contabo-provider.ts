// Contabo Provider for Meet Matt Provisioning
// Uses Contabo API to create and manage VPS instances
// Contabo offers excellent value: 8GB RAM, 4 vCPU for ~$4.50/month

import { 
  CloudProvider, 
  ProvisioningConfig, 
  ProvisionedInstance, 
  InstanceStatus,
  DEFAULT_LIMITS 
} from "./types";

const CONTABO_API_URL = "https://api.contabo.com/v1";
const CONTABO_AUTH_URL = "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token";

// Environment variables for Contabo credentials
// Requires: CONTABO_CLIENT_ID, CONTABO_CLIENT_SECRET, CONTABO_API_USER, CONTABO_API_PASSWORD
const CONTABO_CLIENT_ID = process.env.CONTABO_CLIENT_ID || "";
const CONTABO_CLIENT_SECRET = process.env.CONTABO_CLIENT_SECRET || "";
const CONTABO_API_USER = process.env.CONTABO_API_USER || "";
const CONTABO_API_PASSWORD = process.env.CONTABO_API_PASSWORD || "";

// Contabo product IDs (VPS plans)
// These are the productId values for creating instances
const CONTABO_PRODUCTS = {
  // Cloud VPS plans (NVMe storage)
  vps10: {
    id: "V1",
    name: "Cloud VPS 10",
    cpu: 4,
    memory: 8192,  // 8GB
    disk: 75,      // 75GB NVMe
    costPerMonth: 4.50,
  },
  vps20: {
    id: "V2",
    name: "Cloud VPS 20",
    cpu: 6,
    memory: 12288, // 12GB
    disk: 100,     // 100GB NVMe
    costPerMonth: 7.00,
  },
  vps30: {
    id: "V3",
    name: "Cloud VPS 30",
    cpu: 8,
    memory: 24576, // 24GB
    disk: 200,     // 200GB NVMe
    costPerMonth: 14.00,
  },
  vps40: {
    id: "V4",
    name: "Cloud VPS 40",
    cpu: 12,
    memory: 49152, // 48GB
    disk: 250,     // 250GB NVMe
    costPerMonth: 25.00,
  },
} as const;

type ContaboProduct = keyof typeof CONTABO_PRODUCTS;

// Contabo regions
const CONTABO_REGIONS = {
  eu: { id: "EU", name: "European Union (Germany)" },
  us_central: { id: "US-central", name: "United States Central" },
  us_east: { id: "US-east", name: "United States East" },
  us_west: { id: "US-west", name: "United States West" },
  sg: { id: "SG", name: "Singapore" },
  uk: { id: "UK", name: "United Kingdom" },
  jp: { id: "JP", name: "Japan" },
  au: { id: "AU", name: "Australia" },
} as const;

type ContaboRegion = keyof typeof CONTABO_REGIONS;

// Ubuntu 24.04 LTS image
const UBUNTU_IMAGE = {
  id: "d64d5c6c-9dda-4e38-8174-0ee282474d8a",
  name: "ubuntu-24.04",
  version: "24.04",
};

interface ContaboInstance {
  instanceId: number;
  name: string;
  displayName: string;
  status: string;
  ipConfig: {
    v4: {
      ip: string;
      gateway: string;
      netmaskCidr: number;
    };
    v6?: {
      ip: string;
      gateway: string;
      netmaskCidr: number;
    };
  };
  region: string;
  productId: string;
  createdDate: string;
  imageId: string;
}

interface ContaboCreateOptions {
  imageId: string;
  productId: string;
  region: string;
  displayName?: string;
  defaultUser?: string;
  rootPassword?: number;  // Secret ID for root password
  sshKeys?: number[];     // Array of SSH key IDs
  userData?: string;      // Base64 encoded cloud-init script
}

interface ContaboAPIResponse<T> {
  data: T[];
  _links: {
    first: string;
    previous: string;
    next: string;
    last: string;
    self: string;
  };
  _pagination: {
    size: number;
    totalElements: number;
    totalPages: number;
    page: number;
  };
}

interface ContaboSecret {
  secretId: number;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface ContaboSSHKey {
  sshKeyId: number;
  name: string;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

// Token cache to avoid re-authenticating on every request
let tokenCache: { token: string; expiresAt: number } | null = null;

export class ContaboProvider implements CloudProvider {
  name = "contabo";
  private product: ContaboProduct;
  private region: ContaboRegion;
  
  constructor(
    product: ContaboProduct = "vps10",
    region: ContaboRegion = "us_central"
  ) {
    this.product = product;
    this.region = region;
  }
  
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      return tokenCache.token;
    }
    
    const params = new URLSearchParams({
      client_id: CONTABO_CLIENT_ID,
      client_secret: CONTABO_CLIENT_SECRET,
      username: CONTABO_API_USER,
      password: CONTABO_API_PASSWORD,
      grant_type: "password",
    });
    
    const response = await fetch(CONTABO_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Contabo auth error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Cache the token (expires_in is in seconds, subtract 60s buffer)
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    
    return data.access_token;
  }
  
  private async makeRequest<T>(
    endpoint: string, 
    method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
    body?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${CONTABO_API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-request-id": crypto.randomUUID(),
    };
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body && (method === "POST" || method === "PATCH")) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Contabo API error: ${response.status} - ${errorText}`);
    }
    
    const text = await response.text();
    if (!text || text === "null") {
      return {} as T;
    }
    
    return JSON.parse(text) as T;
  }
  
  async createInstance(config: ProvisioningConfig): Promise<ProvisionedInstance> {
    const displayName = `meetmatt-${config.botName.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}-${Date.now()}`;
    const productConfig = CONTABO_PRODUCTS[this.product];
    const regionConfig = CONTABO_REGIONS[this.region];
    
    // Generate user data script for OpenClaw setup (base64 encoded)
    const userData = Buffer.from(this.generateUserDataScript(config)).toString("base64");
    
    const createOptions: ContaboCreateOptions = {
      imageId: UBUNTU_IMAGE.id,
      productId: productConfig.id,
      region: regionConfig.id,
      displayName: displayName,
      userData: userData,
    };
    
    try {
      const response = await this.makeRequest<{ data: ContaboInstance[] }>("/compute/instances", "POST", createOptions);
      const instance = response.data?.[0];
      
      if (!instance) {
        throw new Error("No instance returned from Contabo API");
      }
      
      return {
        instanceId: instance.instanceId.toString(),
        publicIp: instance.ipConfig?.v4?.ip || "pending",
        status: this.mapStatus(instance.status),
        createdAt: new Date(instance.createdDate),
      };
    } catch (error) {
      console.error("Contabo create instance error:", error);
      throw error;
    }
  }
  
  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    try {
      const response = await this.makeRequest<{ data: ContaboInstance[] }>(`/compute/instances/${instanceId}`);
      const instance = response.data?.[0];
      return instance ? this.mapStatus(instance.status) : "error";
    } catch {
      return "error";
    }
  }
  
  async terminateInstance(instanceId: string): Promise<void> {
    // Contabo uses POST to /compute/instances/{instanceId}/cancel
    await this.makeRequest(`/compute/instances/${instanceId}/cancel`, "POST");
  }
  
  async executeCommand(instanceId: string, command: string): Promise<string> {
    // Contabo doesn't have built-in command execution
    // Would need to SSH into the instance
    console.warn("Contabo executeCommand not implemented - use SSH");
    return "";
  }
  
  async listInstances(): Promise<ContaboInstance[]> {
    const response = await this.makeRequest<ContaboAPIResponse<ContaboInstance>>("/compute/instances");
    return response.data || [];
  }
  
  async getInstance(instanceId: string): Promise<ContaboInstance | null> {
    try {
      const response = await this.makeRequest<{ data: ContaboInstance[] }>(`/compute/instances/${instanceId}`);
      return response.data?.[0] || null;
    } catch {
      return null;
    }
  }
  
  async startInstance(instanceId: string): Promise<void> {
    await this.makeRequest(`/compute/instances/${instanceId}/actions/start`, "POST");
  }
  
  async stopInstance(instanceId: string): Promise<void> {
    await this.makeRequest(`/compute/instances/${instanceId}/actions/stop`, "POST");
  }
  
  async restartInstance(instanceId: string): Promise<void> {
    await this.makeRequest(`/compute/instances/${instanceId}/actions/restart`, "POST");
  }
  
  // Secret management (for passwords)
  async listSecrets(): Promise<ContaboSecret[]> {
    const response = await this.makeRequest<ContaboAPIResponse<ContaboSecret>>("/secrets");
    return response.data || [];
  }
  
  async createSecret(name: string, value: string, type: "password" | "ssh" = "password"): Promise<ContaboSecret> {
    const response = await this.makeRequest<{ data: ContaboSecret[] }>("/secrets", "POST", {
      name,
      value,
      type,
    });
    return response.data[0];
  }
  
  // SSH key management
  async listSSHKeys(): Promise<ContaboSSHKey[]> {
    const response = await this.makeRequest<ContaboAPIResponse<ContaboSSHKey>>("/secrets?type=ssh");
    return response.data || [];
  }
  
  async createSSHKey(name: string, publicKey: string): Promise<ContaboSSHKey> {
    const response = await this.makeRequest<{ data: ContaboSSHKey[] }>("/secrets", "POST", {
      name,
      value: publicKey,
      type: "ssh",
    });
    return response.data[0];
  }
  
  // Get available images
  async listImages(standardOnly: boolean = true): Promise<Array<{ imageId: string; name: string; version: string }>> {
    const response = await this.makeRequest<ContaboAPIResponse<{ imageId: string; name: string; version: string }>>(
      `/compute/images?standardImage=${standardOnly}&size=100`
    );
    return response.data || [];
  }
  
  private mapStatus(contaboStatus: string): InstanceStatus {
    const statusMap: Record<string, InstanceStatus> = {
      "provisioning": "provisioning",
      "installing": "installing",
      "running": "running",
      "stopped": "stopped",
      "error": "error",
      "unknown": "error",
    };
    return statusMap[contaboStatus.toLowerCase()] || "provisioning";
  }
  
  private generateUserDataScript(config: ProvisioningConfig): string {
    const limits = DEFAULT_LIMITS;
    
    return `#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/meetmatt-setup.log) 2>&1

echo "=== Meet Matt OpenClaw Setup (Contabo) ==="
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
export async function listContaboInstances(): Promise<ContaboInstance[]> {
  const provider = new ContaboProvider();
  return provider.listInstances();
}

export async function createContaboInstance(
  config: ProvisioningConfig,
  options?: {
    product?: ContaboProduct;
    region?: ContaboRegion;
  }
): Promise<ProvisionedInstance> {
  const provider = new ContaboProvider(
    options?.product || "vps10",
    options?.region || "us_central"
  );
  return provider.createInstance(config);
}

export async function terminateContaboInstance(instanceId: string): Promise<void> {
  const provider = new ContaboProvider();
  return provider.terminateInstance(instanceId);
}

export async function getContaboInstance(instanceId: string): Promise<ContaboInstance | null> {
  const provider = new ContaboProvider();
  return provider.getInstance(instanceId);
}

// Export types and constants for external use
export { 
  CONTABO_PRODUCTS, 
  CONTABO_REGIONS,
  type ContaboProduct,
  type ContaboRegion,
  type ContaboInstance,
  type ContaboSecret,
  type ContaboSSHKey,
};
