/**
 * Fleet Mode - Types and Interfaces
 * 
 * Scalable agent deployment supporting 1000s of agents
 * via OpenClaw as the runtime provider and Devin for orchestration
 */

// Fleet Status
export type FleetStatus = 
  | "draft"           // Initial creation, not yet deploying
  | "provisioning"    // Creating infrastructure
  | "deploying"       // Actively deploying agents
  | "running"         // All agents deployed and running
  | "scaling"         // Adding more agents
  | "error"           // Deployment failed
  | "paused"          // Fleet temporarily stopped
  | "terminated";     // Fleet shut down

// Agent Instance Status within a Fleet
export type FleetAgentStatus =
  | "pending"         // Waiting to be deployed
  | "provisioning"    // Creating agent runtime
  | "starting"        // Agent starting up
  | "running"         // Agent active and serving
  | "error"           // Failed to start
  | "stopped"         // Manually stopped
  | "updating";       // Configuration update in progress

// Runtime Provider Types
export type RuntimeProvider = 
  | "openclaw"        // Local/remote OpenClaw instances
  | "devin"           // Devin AI sessions
  | "docker"          // Container-based agents
  | "kubernetes";     // K8s deployments

// Fleet Configuration
export interface FleetConfig {
  // Basic settings
  name: string;
  description?: string;
  
  // Scale settings
  targetAgentCount: number;      // Total agents desired
  batchSize: number;             // Deploy N agents at a time
  concurrencyLimit: number;      // Max parallel deployments
  
  // Runtime configuration
  provider: RuntimeProvider;
  runtimeConfig: OpenClawRuntimeConfig | DevinRuntimeConfig;
  
  // Agent template (applied to all agents in fleet)
  agentTemplate: AgentTemplate;
  
  // Advanced options
  options?: {
    autoScale?: boolean;
    minAgents?: number;
    maxAgents?: number;
    healthCheckInterval?: number;
    retryFailed?: boolean;
    maxRetries?: number;
  };
}

// Agent Template - Configuration for each agent in the fleet
export interface AgentTemplate {
  namePrefix: string;            // Prefix for agent names (e.g., "support-bot")
  personality: string;           // professional, friendly, hustler
  useCase: string;               // What the agent does
  capabilities: string[];        // List of skills/capabilities
  model?: string;                // AI model to use
  systemPrompt?: string;         // Custom system prompt
  
  // OpenClaw specific
  openclawConfig?: {
    workspace?: string;
    maxConcurrentTasks?: number;
    compactionMode?: "safeguard" | "performance" | "economy";
  };
}

// OpenClaw Runtime Configuration
export interface OpenClawRuntimeConfig {
  type: "openclaw";
  
  // Connection settings
  gatewayUrl: string;            // OpenClaw gateway URL
  authToken: string;             // Gateway auth token
  
  // Instance configuration
  instances: OpenClawInstance[];
  
  // Scaling options
  maxAgentsPerInstance: number;  // Based on hardware capacity
  
  // Resource limits
  resources?: {
    cpuLimit?: string;
    memoryLimit?: string;
    storageLimit?: string;
  };
}

// Single OpenClaw Instance
export interface OpenClawInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  authToken: string;
  status: "active" | "busy" | "offline" | "maintenance";
  capacity: number;              // Max agents this instance can run
  currentLoad: number;           // Currently running agents
  region?: string;
  tags?: string[];
}

// Devin Runtime Configuration (for orchestration layer)
export interface DevinRuntimeConfig {
  type: "devin";
  apiKey: string;
  
  // Devin is used for orchestration, not direct execution
  // It manages OpenClaw instances
  orchestrationMode: "provision" | "deploy" | "manage";
  
  // Template for Devin sessions
  sessionTemplate?: {
    prompt: string;
    timeout?: number;
  };
}

// Fleet Entity (Database)
export interface Fleet {
  id: string;
  userId: string;
  
  // Identification
  name: string;
  description?: string;
  slug: string;
  
  // Status
  status: FleetStatus;
  statusMessage?: string;
  
  // Configuration
  config: FleetConfig;
  
  // Progress tracking
  progress: {
    totalAgents: number;
    deployedAgents: number;
    failedAgents: number;
    pendingAgents: number;
    lastDeploymentAt?: Date;
    estimatedCompletion?: Date;
  };
  
  // Runtime info
  runtimeInfo?: {
    provider: RuntimeProvider;
    instances: string[];         // IDs of running instances
    endpoints?: string[];        // Access endpoints
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Fleet Agent Instance (Individual agent in a fleet)
export interface FleetAgent {
  id: string;
  fleetId: string;
  userId: string;
  
  // Agent identity
  name: string;
  instanceNumber: number;        // #1, #2, #3 in the fleet
  
  // Status
  status: FleetAgentStatus;
  statusMessage?: string;
  
  // Runtime details
  runtime?: {
    provider: RuntimeProvider;
    instanceId?: string;         // OpenClaw instance ID
    sessionId?: string;          // Devin session ID if applicable
    endpoint?: string;           // Access URL
    containerId?: string;        // Docker container ID
    podName?: string;            // K8s pod name
  };
  
  // Configuration applied
  config: AgentTemplate;
  
  // Health check
  health?: {
    lastCheckAt: Date;
    isHealthy: boolean;
    latency?: number;
    errorCount: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  lastActiveAt?: Date;
}

// Deployment Job (for queue)
export interface FleetDeploymentJob {
  jobId: string;
  fleetId: string;
  agentId?: string;              // For single agent deployment
  batchIndex: number;            // Which batch this is
  totalBatches: number;
  agents: Array<{
    name: string;
    instanceNumber: number;
    config: AgentTemplate;
  }>;
  priority: number;
  retryCount: number;
  createdAt: Date;
}

// Fleet Operation Types
export type FleetOperation = 
  | { type: "create"; config: FleetConfig }
  | { type: "scale"; targetCount: number }
  | { type: "deploy"; batchSize?: number }
  | { type: "stop" }
  | { type: "start" }
  | { type: "terminate" }
  | { type: "update"; updates: Partial<FleetConfig> }
  | { type: "restart_failed" };

// API Request/Response Types
export interface CreateFleetRequest {
  name: string;
  description?: string;
  config: FleetConfig;
}

export interface FleetDeploymentResponse {
  fleetId: string;
  status: FleetStatus;
  message: string;
  estimatedTime?: number;        // Seconds until completion
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

export interface FleetListResponse {
  fleets: Fleet[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FleetDetailResponse {
  fleet: Fleet;
  agents: FleetAgent[];
  metrics?: FleetMetrics;
}

// Metrics
export interface FleetMetrics {
  totalAgents: number;
  activeAgents: number;
  failedAgents: number;
  averageResponseTime?: number;
  totalRequests?: number;
  errorRate?: number;
  uptime?: number;
  
  // Resource usage
  resources?: {
    cpuUsage?: number;
    memoryUsage?: number;
    storageUsage?: number;
  };
  
  // Cost tracking
  estimatedCost?: {
    hourly: number;
    daily: number;
    monthly: number;
  };
}

// Health Check Result
export interface HealthCheckResult {
  agentId: string;
  timestamp: Date;
  isHealthy: boolean;
  latency: number;
  checks: {
    connection: boolean;
    response: boolean;
    memory: boolean;
    error?: string;
  };
}

// Provider Interface (for extensibility)
export interface IRuntimeProvider {
  readonly name: RuntimeProvider;
  
  // Lifecycle methods
  initialize(config: any): Promise<void>;
  deployAgent(agent: FleetAgent): Promise<DeploymentResult>;
  stopAgent(agentId: string): Promise<void>;
  restartAgent(agentId: string): Promise<void>;
  deleteAgent(agentId: string): Promise<void>;
  
  // Health & monitoring
  checkHealth(agent: FleetAgent): Promise<HealthCheckResult>;
  getMetrics(agentId: string): Promise<Partial<FleetMetrics>>;
  
  // Scaling
  canAcceptMoreAgents(instanceId: string): boolean;
  getCapacity(instanceId: string): { used: number; total: number };
}

export interface DeploymentResult {
  success: boolean;
  agentId: string;
  endpoint?: string;
  sessionId?: string;
  containerId?: string;
  error?: string;
  logs?: string[];
  duration: number;
}

// Webhook/Event Types
export type FleetEventType = 
  | "fleet.created"
  | "fleet.deploying"
  | "fleet.running"
  | "fleet.error"
  | "fleet.terminated"
  | "agent.deployed"
  | "agent.failed"
  | "agent.restarted"
  | "agent.stopped"
  | "agent.healthy"
  | "agent.unhealthy";

export interface FleetEvent {
  type: FleetEventType;
  fleetId: string;
  agentId?: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Constants
export const FLEET_CONSTANTS = {
  // Default values
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_CONCURRENCY: 5,
  MAX_CONCURRENCY: 100,
  MAX_BATCH_SIZE: 100,
  
  // Limits
  MAX_AGENTS_PER_FLEET: 10000,
  MAX_FLEETS_PER_USER: 10,
  
  // Timeouts
  DEPLOYMENT_TIMEOUT_MS: 10 * 60 * 1000,      // 10 minutes
  HEALTH_CHECK_INTERVAL_MS: 30 * 1000,        // 30 seconds
  PROVISIONING_TIMEOUT_MS: 5 * 60 * 1000,     // 5 minutes
  
  // Retry settings
  MAX_DEPLOYMENT_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
  
  // OpenClaw specific
  OPENCLAW_DEFAULT_PORT: 18789,
  OPENCLAW_MAX_AGENTS_PER_INSTANCE: 50,
} as const;
