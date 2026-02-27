/**
 * Fleet Manager
 * 
 * Orchestrates the deployment and management of agent fleets.
 * Uses Bull Queue for scalable job processing supporting 1000s of agents.
 * 
 * Architecture:
 * - Fleet Manager: Main orchestrator (this file)
 * - Job Queue: Bull queue for deployment jobs
 * - Workers: Process deployment jobs in parallel
 * - Providers: OpenClaw, Devin, etc. for actual execution
 */

import { Queue, Job, Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@/lib/prisma";
import { 
  Fleet, 
  FleetAgent, 
  FleetConfig, 
  FleetStatus, 
  FleetAgentStatus,
  FleetDeploymentJob,
  CreateFleetRequest,
  FleetDeploymentResponse,
  FleetOperation,
  FLEET_CONSTANTS,
  DeploymentResult,
} from "./types";
import { OpenClawProvider } from "./providers/openclaw";
import { infrastructureProvisioner } from "@/lib/infrastructure/provisioner";
import { EventEmitter } from "events";

// Redis connection for BullMQ
const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Job queue names
const FLEET_DEPLOYMENT_QUEUE = "fleet-deployment";
const FLEET_HEALTH_CHECK_QUEUE = "fleet-health-check";

export class FleetManager extends EventEmitter {
  private static instance: FleetManager;
  private deploymentQueue: Queue;
  private healthCheckQueue: Queue;
  private deploymentWorker?: Worker;
  private healthCheckWorker?: Worker;
  private openclawProvider: OpenClawProvider;
  private isInitialized = false;
  
  // Track active deployments
  private activeDeployments = new Map<string, {
    fleetId: string;
    startTime: number;
    totalJobs: number;
    completedJobs: number;
  }>();
  
  private constructor() {
    super();
    
    // Initialize queues
    this.deploymentQueue = new Queue(FLEET_DEPLOYMENT_QUEUE, {
      connection: redisConnection as any,
      defaultJobOptions: {
        attempts: FLEET_CONSTANTS.MAX_DEPLOYMENT_RETRIES,
        backoff: {
          type: "exponential",
          delay: FLEET_CONSTANTS.RETRY_DELAY_MS,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    
    this.healthCheckQueue = new Queue(FLEET_HEALTH_CHECK_QUEUE, {
      connection: redisConnection as any,
    });
    
    // Initialize OpenClaw provider with default config
    this.openclawProvider = new OpenClawProvider({
      type: "openclaw",
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789",
      authToken: process.env.OPENCLAW_AUTH_TOKEN || "",
      instances: [],
      maxAgentsPerInstance: FLEET_CONSTANTS.OPENCLAW_MAX_AGENTS_PER_INSTANCE,
    });
  }
  
  static getInstance(): FleetManager {
    if (!FleetManager.instance) {
      FleetManager.instance = new FleetManager();
    }
    return FleetManager.instance;
  }
  
  /**
   * Initialize the fleet manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    console.log("[FleetManager] Initializing...");
    
    // Load OpenClaw instances from environment/config
    const instances = this.loadOpenClawInstances();
    
    await this.openclawProvider.initialize({
      type: "openclaw",
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789",
      authToken: process.env.OPENCLAW_AUTH_TOKEN || "",
      instances,
      maxAgentsPerInstance: FLEET_CONSTANTS.OPENCLAW_MAX_AGENTS_PER_INSTANCE,
    });
    
    // Start workers
    this.startDeploymentWorker();
    this.startHealthCheckWorker();
    
    this.isInitialized = true;
    console.log("[FleetManager] Initialized successfully");
  }
  
  /**
   * Create a new fleet
   */
  async createFleet(
    userId: string, 
    request: CreateFleetRequest
  ): Promise<FleetDeploymentResponse> {
    // Validate fleet config
    this.validateFleetConfig(request.config);
    
    // Generate unique slug
    const slug = this.generateFleetSlug(request.name);
    
    // Create fleet record in database
    const fleet = await prisma.fleet.create({
      data: {
        userId,
        name: request.name,
        description: request.description,
        slug,
        status: "draft",
        config: JSON.stringify(request.config),
        progress: JSON.stringify({
          totalAgents: request.config.targetAgentCount,
          deployedAgents: 0,
          failedAgents: 0,
          pendingAgents: request.config.targetAgentCount,
        }),
      },
    });
    
    // Create fleet agent records
    await this.createFleetAgents(fleet.id, userId, request.config);
    
    console.log(`[FleetManager] Created fleet ${fleet.id} with ${request.config.targetAgentCount} agents`);
    
    this.emit("fleet.created", { fleetId: fleet.id, userId });
    
    return {
      fleetId: fleet.id,
      status: "draft",
      message: `Fleet created with ${request.config.targetAgentCount} agents ready for deployment`,
      progress: {
        total: request.config.targetAgentCount,
        completed: 0,
        failed: 0,
        pending: request.config.targetAgentCount,
      },
    };
  }
  
  /**
   * Start deploying a fleet
   */
  async deployFleet(fleetId: string): Promise<FleetDeploymentResponse> {
    const fleet = await this.getFleetFromDB(fleetId);
    
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }
    
    if (fleet.status !== "draft" && fleet.status !== "error") {
      throw new Error(`Cannot deploy fleet in ${fleet.status} status`);
    }
    
    // Update status to provisioning
    await this.updateFleetStatus(fleetId, "provisioning", "Provisioning infrastructure...");
    
    // Get all pending agents
    const agents = await prisma.fleetAgent.findMany({
      where: { fleetId, status: "pending" },
    });
    
    const config = JSON.parse(fleet.config as string) as FleetConfig;
    const batchSize = config.batchSize || FLEET_CONSTANTS.DEFAULT_BATCH_SIZE;
    const concurrencyLimit = config.concurrencyLimit || FLEET_CONSTANTS.DEFAULT_CONCURRENCY;
    
    // Calculate required infrastructure
    const agentsPerInstance = 50; // Default capacity per OpenClaw instance
    const requiredInstances = Math.ceil(agents.length / agentsPerInstance);
    
    // Provision infrastructure if auto-provisioning is enabled
    if (process.env.ENABLE_AUTO_PROVISIONING === "true") {
      console.log(`[FleetManager] Provisioning ${requiredInstances} instances for fleet ${fleetId}`);
      
      try {
        const provisionResult = await infrastructureProvisioner.provisionForFleet({
          fleetId,
          userId: fleet.userId,
          minInstances: requiredInstances,
          maxInstances: requiredInstances + 2, // Buffer
          agentsPerInstance,
          priority: "normal",
        });
        
        if (!provisionResult.success) {
          throw new Error(`Infrastructure provisioning failed: ${provisionResult.failed.map(f => f.error).join(", ")}`);
        }
        
        console.log(`[FleetManager] Provisioned ${provisionResult.servers.length} instances`);
        
        // Update OpenClaw provider with new instances
        await this.updateOpenClawInstances(provisionResult.servers);
        
      } catch (error: any) {
        console.error(`[FleetManager] Infrastructure provisioning failed:`, error);
        await this.updateFleetStatus(fleetId, "error", `Infrastructure error: ${error.message}`);
        throw error;
      }
    }
    
    // Split agents into batches
    const batches = this.chunkArray(agents, batchSize);
    
    console.log(`[FleetManager] Deploying fleet ${fleetId}: ${agents.length} agents in ${batches.length} batches`);
    
    // Add deployment jobs to queue
    const jobs: Job[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      const jobData: FleetDeploymentJob = {
        jobId: `deploy-${fleetId}-${i}`,
        fleetId,
        batchIndex: i,
        totalBatches: batches.length,
        agents: batch.map((agent, idx) => ({
          name: agent.name,
          instanceNumber: agent.instanceNumber,
          config: JSON.parse(agent.config as string),
        })),
        priority: i, // Process in order
        retryCount: 0,
        createdAt: new Date(),
      };
      
      const job = await this.deploymentQueue.add(
        "deploy-batch",
        jobData,
        {
          jobId: jobData.jobId,
          priority: i,
        }
      );
      
      jobs.push(job);
    }
    
    // Track active deployment
    this.activeDeployments.set(fleetId, {
      fleetId,
      startTime: Date.now(),
      totalJobs: jobs.length,
      completedJobs: 0,
    });
    
    // Update status to deploying
    await this.updateFleetStatus(fleetId, "deploying", `Deploying ${agents.length} agents...`);
    
    // Estimate completion time
    const estimatedTime = this.estimateDeploymentTime(
      agents.length, 
      batchSize, 
      concurrencyLimit
    );
    
    this.emit("fleet.deploying", { fleetId, totalAgents: agents.length, batches: batches.length });
    
    return {
      fleetId,
      status: "deploying",
      message: `Deploying ${agents.length} agents in ${batches.length} batches`,
      estimatedTime,
      progress: {
        total: agents.length,
        completed: 0,
        failed: 0,
        pending: agents.length,
      },
    };
  }
  
  /**
   * Scale a fleet up or down
   */
  async scaleFleet(fleetId: string, targetCount: number): Promise<FleetDeploymentResponse> {
    const fleet = await this.getFleetFromDB(fleetId);
    
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }
    
    const config = JSON.parse(fleet.config as string) as FleetConfig;
    const currentCount = (fleet.progress as any).totalAgents || 0;
    
    if (targetCount === currentCount) {
      return {
        fleetId,
        status: fleet.status as FleetStatus,
        message: "No scaling needed",
        progress: fleet.progress as any,
      };
    }
    
    if (targetCount > currentCount) {
      // Scale up - add more agents
      const agentsToAdd = targetCount - currentCount;
      
      // Update config
      config.targetAgentCount = targetCount;
      
      // Create new agents
      await this.createFleetAgents(fleetId, fleet.userId, config, currentCount + 1);
      
      // Update fleet config
      await prisma.fleet.update({
        where: { id: fleetId },
        data: {
          config: JSON.stringify(config),
          status: "scaling",
        },
      });
      
      // Trigger deployment
      return this.deployFleet(fleetId);
      
    } else {
      // Scale down - remove agents
      const agentsToRemove = currentCount - targetCount;
      
      // Get agents to remove (newest first)
      const agents = await prisma.fleetAgent.findMany({
        where: { fleetId },
        orderBy: { instanceNumber: "desc" },
        take: agentsToRemove,
      });
      
      // Stop and remove agents
      for (const agent of agents) {
        try {
          await this.openclawProvider.deleteAgent(agent.id);
          await prisma.fleetAgent.delete({ where: { id: agent.id } });
        } catch (error) {
          console.error(`[FleetManager] Error removing agent ${agent.id}:`, error);
        }
      }
      
      // Update config and progress
      config.targetAgentCount = targetCount;
      const progress = fleet.progress as any;
      progress.totalAgents = targetCount;
      progress.deployedAgents = Math.min(progress.deployedAgents, targetCount);
      
      await prisma.fleet.update({
        where: { id: fleetId },
        data: {
          config: JSON.stringify(config),
          progress: JSON.stringify(progress),
        },
      });
      
      return {
        fleetId,
        status: fleet.status as FleetStatus,
        message: `Scaled down to ${targetCount} agents`,
        progress: progress,
      };
    }
  }
  
  /**
   * Get fleet details
   */
  async getFleet(fleetId: string, includeAgents = false) {
    const fleet = await this.getFleetFromDB(fleetId);
    
    if (!fleet) {
      return null;
    }
    
    const result: any = {
      ...fleet,
      config: JSON.parse(fleet.config as string),
      progress: fleet.progress as any,
    };
    
    if (includeAgents) {
      const agents = await prisma.fleetAgent.findMany({
        where: { fleetId },
        orderBy: { instanceNumber: "asc" },
      });
      
      result.agents = agents.map(agent => ({
        ...agent,
        config: JSON.parse(agent.config as string),
        runtime: agent.runtime ? JSON.parse(agent.runtime as string) : null,
        health: agent.health ? JSON.parse(agent.health as string) : null,
      }));
    }
    
    return result;
  }
  
  /**
   * List fleets for a user
   */
  async listFleets(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    
    const [fleets, total] = await Promise.all([
      prisma.fleet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.fleet.count({ where: { userId } }),
    ]);
    
    return {
      fleets: fleets.map(fleet => ({
        ...fleet,
        config: JSON.parse(fleet.config as string),
        progress: fleet.progress as any,
      })),
      total,
      page,
      pageSize,
    };
  }
  
  /**
   * Terminate a fleet
   */
  async terminateFleet(fleetId: string): Promise<void> {
    const fleet = await this.getFleetFromDB(fleetId);
    
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }
    
    console.log(`[FleetManager] Terminating fleet ${fleetId}...`);
    
    // Get all agents
    const agents = await prisma.fleetAgent.findMany({
      where: { fleetId },
    });
    
    // Stop all agents
    for (const agent of agents) {
      try {
        await this.openclawProvider.deleteAgent(agent.id);
      } catch (error) {
        console.error(`[FleetManager] Error stopping agent ${agent.id}:`, error);
      }
    }
    
    // Update fleet status
    await this.updateFleetStatus(fleetId, "terminated", "Fleet terminated by user");
    
    // Clean up queue jobs
    await this.deploymentQueue.clean(0, "completed");
    await this.deploymentQueue.clean(0, "failed");
    
    this.emit("fleet.terminated", { fleetId });
    
    console.log(`[FleetManager] Fleet ${fleetId} terminated`);
  }
  
  /**
   * Get deployment status/progress
   */
  async getDeploymentStatus(fleetId: string): Promise<FleetDeploymentResponse> {
    const fleet = await this.getFleetFromDB(fleetId);
    
    if (!fleet) {
      throw new Error(`Fleet ${fleetId} not found`);
    }
    
    const progress = fleet.progress as any;
    
    return {
      fleetId,
      status: fleet.status as FleetStatus,
      message: fleet.statusMessage || "",
      progress: {
        total: progress.totalAgents || 0,
        completed: progress.deployedAgents || 0,
        failed: progress.failedAgents || 0,
        pending: progress.pendingAgents || 0,
      },
    };
  }
  
  /**
   * Start the deployment worker
   */
  private startDeploymentWorker(): void {
    this.deploymentWorker = new Worker(
      FLEET_DEPLOYMENT_QUEUE,
      async (job: Job) => {
        const data = job.data as FleetDeploymentJob;
        
        console.log(`[FleetWorker] Processing batch ${data.batchIndex + 1}/${data.totalBatches} for fleet ${data.fleetId}`);
        
        await this.processDeploymentBatch(data);
      },
      {
        connection: redisConnection as any,
        concurrency: 5, // Process 5 batches concurrently
      }
    );
    
    this.deploymentWorker.on("completed", (job) => {
      console.log(`[FleetWorker] Job ${job.id} completed`);
    });
    
    this.deploymentWorker.on("failed", (job, error) => {
      console.error(`[FleetWorker] Job ${job?.id} failed:`, error);
    });
    
    console.log("[FleetManager] Deployment worker started");
  }
  
  /**
   * Start the health check worker
   */
  private startHealthCheckWorker(): void {
    this.healthCheckWorker = new Worker(
      FLEET_HEALTH_CHECK_QUEUE,
      async (job: Job) => {
        const { fleetId } = job.data;
        await this.runHealthChecks(fleetId);
      },
      {
        connection: redisConnection as any,
        concurrency: 3,
      }
    );
    
    console.log("[FleetManager] Health check worker started");
  }
  
  /**
   * Process a deployment batch
   */
  private async processDeploymentBatch(job: FleetDeploymentJob): Promise<void> {
    const { fleetId, agents, batchIndex, totalBatches } = job;
    
    let completed = 0;
    let failed = 0;
    
    // Deploy each agent in the batch
    for (const agentData of agents) {
      try {
        // Create or get fleet agent record
        const agent = await this.getOrCreateFleetAgent(fleetId, agentData);
        
        // Update status to provisioning
        await this.updateAgentStatus(agent.id, "provisioning");
        
        // Deploy via OpenClaw
        const result = await this.openclawProvider.deployAgent({
          ...agent,
          config: agentData.config,
        } as FleetAgent);
        
        if (result.success) {
          // Update agent with runtime info
          await prisma.fleetAgent.update({
            where: { id: agent.id },
            data: {
              status: "running",
              runtime: JSON.stringify({
                provider: "openclaw",
                endpoint: result.endpoint,
                sessionId: result.sessionId,
              }),
              startedAt: new Date(),
            },
          });
          
          completed++;
          this.emit("agent.deployed", { fleetId, agentId: agent.id });
          
        } else {
          throw new Error(result.error || "Deployment failed");
        }
        
      } catch (error: any) {
        console.error(`[FleetWorker] Failed to deploy agent:`, error);
        
        // Update agent status
        const agent = await this.getOrCreateFleetAgent(fleetId, agentData);
        await this.updateAgentStatus(agent.id, "error", error.message);
        
        failed++;
        this.emit("agent.failed", { fleetId, agentId: agent.id, error: error.message });
      }
    }
    
    // Update fleet progress
    await this.updateFleetProgress(fleetId, completed, failed);
    
    // Check if deployment is complete
    const fleet = await this.getFleetFromDB(fleetId);
    if (fleet) {
      const progress = fleet.progress as any;
      
      if (progress.pendingAgents === 0) {
        // All done
        const finalStatus = progress.failedAgents > 0 ? "error" : "running";
        await this.updateFleetStatus(
          fleetId, 
          finalStatus as FleetStatus,
          finalStatus === "running" ? "All agents deployed successfully" : "Deployment completed with errors"
        );
        
        this.emit("fleet.completed", { fleetId, status: finalStatus });
      }
    }
  }
  
  /**
   * Run health checks for all agents in a fleet
   */
  private async runHealthChecks(fleetId: string): Promise<void> {
    const agents = await prisma.fleetAgent.findMany({
      where: { 
        fleetId, 
        status: "running",
      },
    });
    
    for (const agent of agents) {
      try {
        const health = await this.openclawProvider.checkHealth({
          ...agent,
          config: JSON.parse(agent.config as string),
        } as FleetAgent);
        
        await prisma.fleetAgent.update({
          where: { id: agent.id },
          data: {
            health: JSON.stringify({
              lastCheckAt: health.timestamp,
              isHealthy: health.isHealthy,
              latency: health.latency,
              errorCount: health.isHealthy ? 0 : ((agent.health as any)?.errorCount || 0) + 1,
            }),
          },
        });
        
        if (!health.isHealthy) {
          this.emit("agent.unhealthy", { fleetId, agentId: agent.id, health });
        }
        
      } catch (error) {
        console.error(`[FleetManager] Health check failed for agent ${agent.id}:`, error);
      }
    }
  }
  
  /**
   * Create fleet agent records
   */
  private async createFleetAgents(
    fleetId: string, 
    userId: string, 
    config: FleetConfig,
    startNumber = 1
  ): Promise<void> {
    const agents: any[] = [];
    
    for (let i = 0; i < config.targetAgentCount; i++) {
      const instanceNumber = startNumber + i;
      
      agents.push({
        fleetId,
        userId,
        name: `${config.agentTemplate.namePrefix}-${instanceNumber.toString().padStart(4, "0")}`,
        instanceNumber,
        status: "pending",
        config: JSON.stringify(config.agentTemplate),
      });
    }
    
    // Bulk create agents
    await prisma.fleetAgent.createMany({
      data: agents,
    });
  }
  
  /**
   * Get or create a fleet agent record
   */
  private async getOrCreateFleetAgent(
    fleetId: string, 
    agentData: { name: string; instanceNumber: number; config: any }
  ): Promise<any> {
    let agent = await prisma.fleetAgent.findFirst({
      where: {
        fleetId,
        name: agentData.name,
      },
    });
    
    if (!agent) {
      const fleet = await prisma.fleet.findUnique({
        where: { id: fleetId },
        select: { userId: true },
      });
      
      agent = await prisma.fleetAgent.create({
        data: {
          fleetId,
          userId: fleet?.userId || "",
          name: agentData.name,
          instanceNumber: agentData.instanceNumber,
          status: "pending",
          config: JSON.stringify(agentData.config),
        },
      });
    }
    
    return agent;
  }
  
  /**
   * Update fleet status
   */
  private async updateFleetStatus(
    fleetId: string, 
    status: FleetStatus, 
    message?: string
  ): Promise<void> {
    await prisma.fleet.update({
      where: { id: fleetId },
      data: {
        status,
        statusMessage: message,
        ...(status === "running" ? { completedAt: new Date() } : {}),
        ...(status === "deploying" ? { startedAt: new Date() } : {}),
      },
    });
  }
  
  /**
   * Update fleet progress
   */
  private async updateFleetProgress(
    fleetId: string, 
    completed: number, 
    failed: number
  ): Promise<void> {
    const fleet = await prisma.fleet.findUnique({
      where: { id: fleetId },
      select: { progress: true },
    });
    
    if (!fleet) return;
    
    const progress = fleet.progress as any;
    progress.deployedAgents += completed;
    progress.failedAgents += failed;
    progress.pendingAgents = Math.max(0, progress.totalAgents - progress.deployedAgents - progress.failedAgents);
    progress.lastDeploymentAt = new Date();
    
    await prisma.fleet.update({
      where: { id: fleetId },
      data: { progress: JSON.stringify(progress) },
    });
  }
  
  /**
   * Update agent status
   */
  private async updateAgentStatus(
    agentId: string, 
    status: FleetAgentStatus, 
    message?: string
  ): Promise<void> {
    await prisma.fleetAgent.update({
      where: { id: agentId },
      data: {
        status,
        statusMessage: message,
        updatedAt: new Date(),
      },
    });
  }
  
  /**
   * Get fleet from database
   */
  private async getFleetFromDB(fleetId: string) {
    return prisma.fleet.findUnique({
      where: { id: fleetId },
    });
  }
  
  /**
   * Load OpenClaw instances from environment/config
   */
  private loadOpenClawInstances() {
    const instances = [];
    
    // Default local instance
    instances.push({
      id: "local-1",
      name: "Local OpenClaw",
      host: "localhost",
      port: FLEET_CONSTANTS.OPENCLAW_DEFAULT_PORT,
      authToken: process.env.OPENCLAW_AUTH_TOKEN || "",
      status: "active" as const,
      capacity: FLEET_CONSTANTS.OPENCLAW_MAX_AGENTS_PER_INSTANCE,
      currentLoad: 0,
    });
    
    // Additional instances can be loaded from environment variables
    // OPENCLAW_INSTANCES=[{"id":"remote-1","host":"..."}]
    if (process.env.OPENCLAW_INSTANCES) {
      try {
        const additional = JSON.parse(process.env.OPENCLAW_INSTANCES);
        instances.push(...additional);
      } catch (error) {
        console.error("[FleetManager] Failed to parse OPENCLAW_INSTANCES:", error);
      }
    }
    
    return instances;
  }
  
  /**
   * Update OpenClaw provider with provisioned instances
   */
  private async updateOpenClawInstances(servers: any[]): Promise<void> {
    const instances = servers.map(server => ({
      id: server.id,
      name: server.name,
      host: server.publicIp,
      port: server.openclawConfig.port,
      authToken: server.openclawConfig.authToken,
      status: "active" as const,
      capacity: server.openclawConfig.maxAgents,
      currentLoad: 0,
    }));
    
    // Re-initialize OpenClaw provider with new instances
    const currentConfig = this.openclawProvider.getConfig?.() || {
      type: "openclaw" as const,
      gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789",
      authToken: process.env.OPENCLAW_AUTH_TOKEN || "",
      instances: [],
      maxAgentsPerInstance: FLEET_CONSTANTS.OPENCLAW_MAX_AGENTS_PER_INSTANCE,
    };
    
    await this.openclawProvider.initialize({
      ...currentConfig,
      instances: [...currentConfig.instances, ...instances],
    });
    
    console.log(`[FleetManager] Added ${instances.length} OpenClaw instances`);
  }
  
  /**
   * Validate fleet configuration
   */
  private validateFleetConfig(config: FleetConfig): void {
    if (!config.name || config.name.length < 3) {
      throw new Error("Fleet name must be at least 3 characters");
    }
    
    if (config.targetAgentCount < 1) {
      throw new Error("Target agent count must be at least 1");
    }
    
    if (config.targetAgentCount > FLEET_CONSTANTS.MAX_AGENTS_PER_FLEET) {
      throw new Error(`Target agent count cannot exceed ${FLEET_CONSTANTS.MAX_AGENTS_PER_FLEET}`);
    }
    
    if (!config.agentTemplate?.namePrefix) {
      throw new Error("Agent template must have a namePrefix");
    }
    
    if (!config.agentTemplate?.personality) {
      throw new Error("Agent template must have a personality");
    }
  }
  
  /**
   * Generate unique slug for fleet
   */
  private generateFleetSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    return `${base}-${Date.now().toString(36)}`;
  }
  
  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Estimate deployment time in seconds
   */
  private estimateDeploymentTime(
    totalAgents: number, 
    batchSize: number, 
    concurrency: number
  ): number {
    const batches = Math.ceil(totalAgents / batchSize);
    const timePerBatch = 30; // Assume 30 seconds per batch
    const parallelBatches = Math.ceil(batches / concurrency);
    
    return parallelBatches * timePerBatch;
  }
  
  /**
   * Shutdown the fleet manager
   */
  async shutdown(): Promise<void> {
    console.log("[FleetManager] Shutting down...");
    
    await this.deploymentWorker?.close();
    await this.healthCheckWorker?.close();
    await this.deploymentQueue.close();
    await this.healthCheckQueue.close();
    
    redisConnection.disconnect();
    
    this.isInitialized = false;
    console.log("[FleetManager] Shutdown complete");
  }
}

// Export singleton instance
export const fleetManager = FleetManager.getInstance();
