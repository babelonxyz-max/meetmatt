/**
 * Infrastructure Provisioning Types
 * 
 * Auto-provisioning of OpenClaw instances across cloud providers
 * to support 1000s of agents
 */

export type CloudProvider = "contabo" | "hetzner" | "aws" | "gcp" | "azure" | "digitalocean";

export type ServerStatus = 
  | "provisioning"    // Creating VM
  | "installing"      // Installing OpenClaw
  | "configuring"     // Configuring OpenClaw
  | "ready"           // Ready for agents
  | "active"          // Running agents
  | "full"            // At capacity
  | "error"           // Failed
  | "decommissioning" // Shutting down
  | "terminated";     // Deleted

export interface ServerSpecs {
  vcpu: number;
  memoryGb: number;
  storageGb: number;
  storageType: "ssd" | "nvme" | "hdd";
}

export interface ContaboConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  apiUser: string;
  apiPassword: string;
}

export interface InfrastructureConfig {
  provider: CloudProvider;
  region: string;
  specs: ServerSpecs;
  image: string;           // OS image ID
  sshKeyId?: string;       // SSH key for access
  startupScript?: string;  // Cloud-init script
}

export interface ProvisionedServer {
  id: string;
  provider: CloudProvider;
  providerInstanceId: string;
  
  // Server details
  name: string;
  status: ServerStatus;
  
  // Network
  publicIp?: string;
  privateIp?: string;
  hostname: string;
  
  // Configuration
  specs: ServerSpecs;
  region: string;
  
  // OpenClaw configuration
  openclawConfig: {
    installed: boolean;
    version?: string;
    port: number;
    authToken: string;
    maxAgents: number;
  };
  
  // Capacity tracking
  capacity: {
    maxAgents: number;
    currentAgents: number;
    availableSlots: number;
  };
  
  // Costs
  cost: {
    hourlyRate: number;
    currency: string;
  };
  
  // Timestamps
  createdAt: Date;
  readyAt?: Date;
  lastActiveAt?: Date;
  terminatedAt?: Date;
}

export interface ProvisioningRequest {
  fleetId: string;
  userId: string;
  
  // Requirements
  minInstances: number;
  maxInstances: number;
  agentsPerInstance: number;
  
  // Preferences
  preferredRegions?: string[];
  maxHourlyCost?: number;
  
  // Urgency
  priority: "low" | "normal" | "high" | "urgent";
}

export interface ProvisioningResult {
  success: boolean;
  servers: ProvisionedServer[];
  failed: Array<{
    region: string;
    error: string;
  }>;
  estimatedCost: {
    hourly: number;
    monthly: number;
  };
}

export interface AutoScalingPolicy {
  enabled: boolean;
  
  // Scale up triggers
  scaleUp: {
    cpuThreshold: number;      // CPU % to trigger scale up
    memoryThreshold: number;   // Memory % to trigger scale up
    agentRatioThreshold: number; // Agents/capacity ratio
    cooldownMinutes: number;
  };
  
  // Scale down triggers
  scaleDown: {
    cpuThreshold: number;
    memoryThreshold: number;
    agentRatioThreshold: number;
    minInstances: number;
    cooldownMinutes: number;
  };
  
  // Limits
  maxInstances: number;
  minInstances: number;
  maxHourlyCost: number;
}

export interface InfrastructureMetrics {
  totalServers: number;
  activeServers: number;
  totalCapacity: number;
  usedCapacity: number;
  
  // Costs
  hourlyCost: number;
  dailyCost: number;
  monthlyProjection: number;
  
  // Performance
  averageCpuUsage: number;
  averageMemoryUsage: number;
  averageResponseTime: number;
  
  // Health
  healthyServers: number;
  unhealthyServers: number;
  errorRate: number;
}

export interface CloudInstanceType {
  id: string;
  provider: CloudProvider;
  name: string;
  specs: ServerSpecs;
  price: {
    hourly: number;
    monthly: number;
  };
  regions: string[];
  available: boolean;
}

// Contabo-specific types
export interface ContaboInstanceResponse {
  tenantId: string;
  customerId: string;
  instanceId: number;
  createdDate: string;
  cancelDate?: string;
  status: string;
  vHostId?: number;
  vHostNumber?: number;
  addOns: any[];
  productId: string;
  productName: string;
  region: string;
  imageId: string;
  imageName: string;
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
  macAddress: string;
  ramMb: number;
  cpuCores: number;
  osType: string;
  diskMb: number;
}

// Pricing tiers for capacity planning
export const SERVER_TIERS: Record<string, { specs: ServerSpecs; maxAgents: number }> = {
  small: {
    specs: { vcpu: 2, memoryGb: 4, storageGb: 50, storageType: "ssd" },
    maxAgents: 10,
  },
  medium: {
    specs: { vcpu: 4, memoryGb: 8, storageGb: 100, storageType: "ssd" },
    maxAgents: 25,
  },
  large: {
    specs: { vcpu: 8, memoryGb: 16, storageGb: 200, storageType: "nvme" },
    maxAgents: 50,
  },
  xlarge: {
    specs: { vcpu: 16, memoryGb: 32, storageGb: 400, storageType: "nvme" },
    maxAgents: 100,
  },
};

// Contabo region mapping
export const CONTABO_REGIONS: Record<string, string> = {
  "EU": "European Union",
  "US": "United States",
  "UK": "United Kingdom",
  "SG": "Singapore",
  "AU": "Australia",
  "JP": "Japan",
};
