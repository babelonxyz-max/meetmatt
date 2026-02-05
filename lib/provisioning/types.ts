// Types for Meet Matt Provisioning System

export interface ProvisioningConfig {
  // User info
  userId: string;
  email?: string;
  
  // Bot configuration
  botName: string;
  botUsername: string;
  botDescription?: string;
  botProfileImage?: string;
  
  // Features/packages
  package: PackageType;
  features: string[];
  
  // Tier determines limits
  tier: "basic" | "pro" | "enterprise";
}

export type PackageType = 
  | "assistant"      // Personal AI assistant
  | "support"        // Customer support bot
  | "coder"          // Code helper
  | "writer"         // Content writer
  | "custom";        // Custom configuration

export interface ProvisionedInstance {
  instanceId: string;
  publicIp: string;
  status: InstanceStatus;
  botToken?: string;
  botUsername?: string;
  verificationCode?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type InstanceStatus = 
  | "provisioning"   // Server being created
  | "installing"     // OpenClaw being installed
  | "configuring"    // Bot being configured
  | "awaiting_verification"  // Waiting for user to verify
  | "active"         // Bot is live
  | "suspended"      // Temporarily disabled
  | "terminated";    // Shut down

export interface RateLimits {
  messagesPerDay: number;
  maxContextTokens: number;
  maxResponseTokens: number;
  responseTimeoutMs: number;
}

export const TIER_LIMITS: Record<ProvisioningConfig["tier"], RateLimits> = {
  basic: {
    messagesPerDay: 100,
    maxContextTokens: 8000,
    maxResponseTokens: 2000,
    responseTimeoutMs: 60000,
  },
  pro: {
    messagesPerDay: 500,
    maxContextTokens: 32000,
    maxResponseTokens: 4000,
    responseTimeoutMs: 90000,
  },
  enterprise: {
    messagesPerDay: -1, // unlimited
    maxContextTokens: 128000,
    maxResponseTokens: 8000,
    responseTimeoutMs: 120000,
  },
};

export interface VerificationRequest {
  instanceId: string;
  code: string;
  telegramUserId: number;
  expiresAt: Date;
}

// Cloud provider abstraction
export interface CloudProvider {
  name: string;
  createInstance(config: ProvisioningConfig): Promise<ProvisionedInstance>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  terminateInstance(instanceId: string): Promise<void>;
  executeCommand(instanceId: string, command: string): Promise<string>;
}
