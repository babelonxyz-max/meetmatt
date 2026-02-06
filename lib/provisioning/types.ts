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
  // Track which account was used to create the bot
  creatorAccountId?: string;
}

export type InstanceStatus = 
  | "provisioning"   // Server being created
  | "installing"     // OpenClaw being installed
  | "configuring"    // Bot being configured
  | "awaiting_verification"  // Waiting for user to verify
  | "active"         // Bot is live
  | "running"        // Server is running (BitLaunch)
  | "stopped"        // Server is stopped (BitLaunch)
  | "suspended"      // Temporarily disabled
  | "terminated"     // Shut down
  | "error";         // Error state

// Default limits for all users (no tiers)
export interface ServiceLimits {
  maxContextTokens: number;
  maxResponseTokens: number;
  responseTimeoutMs: number;
}

export const DEFAULT_LIMITS: ServiceLimits = {
  maxContextTokens: 128000,  // K2.5 supports large context
  maxResponseTokens: 8000,
  responseTimeoutMs: 120000, // 2 minutes
};

export interface VerificationRequest {
  instanceId: string;
  code: string;
  telegramUserId: number;
  expiresAt: Date;
}

// Telegram account for bot creation (with fallback support)
export interface TelegramCreatorAccount {
  id: string;
  phone: string;
  apiId: number;
  apiHash: string;
  sessionFile: string;
  status: "active" | "locked" | "banned" | "unknown";
  priority: number;  // Lower = higher priority (0 = primary)
  lastUsed?: Date;
  lastError?: string;
  createdBots: number;
}

export interface AccountHealthAlert {
  accountId: string;
  phone: string;
  status: TelegramCreatorAccount["status"];
  error: string;
  timestamp: Date;
  requiresAction: boolean;
}

// Cloud provider abstraction
export interface CloudProvider {
  name: string;
  createInstance(config: ProvisioningConfig): Promise<ProvisionedInstance>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  terminateInstance(instanceId: string): Promise<void>;
  executeCommand(instanceId: string, command: string): Promise<string>;
}
