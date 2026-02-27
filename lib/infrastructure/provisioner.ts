/**
 * Infrastructure Provisioner
 * 
 * Manages the lifecycle of OpenClaw instances across cloud providers.
 * Handles auto-scaling, cost optimization, and health monitoring.
 */

import { Queue, Job, Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@/lib/prisma";
import { fleetManager } from "@/lib/fleet/manager";
import { ContaboClient } from "./providers/contabo";
import {
  ProvisionedServer,
  ProvisioningRequest,
  ProvisioningResult,
  InfrastructureConfig,
  ServerSpecs,
  AutoScalingPolicy,
  SERVER_TIERS,
  CloudProvider,
} from "./types";

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const PROVISIONING_QUEUE = "infrastructure-provisioning";
const HEALTH_CHECK_QUEUE = "infrastructure-health";

export class InfrastructureProvisioner {
  private static instance: InfrastructureProvisioner;
  private provisioningQueue: Queue;
  private healthCheckQueue: Queue;
  private provisioningWorker?: Worker;
  private healthCheckWorker?: Worker;
  private contaboClient?: ContaboClient;
  private isInitialized = false;
  
  // Track active servers
  private activeServers = new Map<string, ProvisionedServer>();
  private fleetServerMap = new Map<string, string[]>(); // fleetId -> serverIds

  private constructor() {
    this.provisioningQueue = new Queue(PROVISIONING_QUEUE, {
      connection: redisConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 30000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });

    this.healthCheckQueue = new Queue(HEALTH_CHECK_QUEUE, {
      connection: redisConnection as any,
      defaultJobOptions: {
        repeat: { every: 60000 }, // Every minute
      },
    });
  }

  static getInstance(): InfrastructureProvisioner {
    if (!InfrastructureProvisioner.instance) {
      InfrastructureProvisioner.instance = new InfrastructureProvisioner();
    }
    return InfrastructureProvisioner.instance;
  }

  /**
   * Initialize the provisioner
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[InfrastructureProvisioner] Initializing...");

    // Initialize Contabo client if credentials available
    if (process.env.CONTABO_CLIENT_ID) {
      this.contaboClient = new ContaboClient({
        apiUrl: process.env.CONTABO_API_URL || "https://api.contabo.com",
        clientId: process.env.CONTABO_CLIENT_ID,
        clientSecret: process.env.CONTABO_CLIENT_SECRET || "",
        apiUser: process.env.CONTABO_API_USER || "",
        apiPassword: process.env.CONTABO_API_PASSWORD || "",
      });
      console.log("[InfrastructureProvisioner] Contabo client initialized");
    }

    // Load existing servers from DB
    await this.loadExistingServers();

    // Start workers
    this.startProvisioningWorker();
    this.startHealthCheckWorker();

    this.isInitialized = true;
    console.log("[InfrastructureProvisioner] Initialized successfully");
  }

  /**
   * Provision infrastructure for a fleet
   */
  async provisionForFleet(request: ProvisioningRequest): Promise<ProvisioningResult> {
    console.log(`[InfrastructureProvisioner] Provisioning for fleet ${request.fleetId}: ${request.minInstances}-${request.maxInstances} instances`);

    const servers: ProvisionedServer[] = [];
    const failed: Array<{ region: string; error: string }> = [];

    // Calculate how many instances we need
    const existingServers = this.fleetServerMap.get(request.fleetId) || [];
    const neededInstances = request.minInstances - existingServers.length;

    if (neededInstances <= 0) {
      console.log(`[InfrastructureProvisioner] Fleet ${request.fleetId} already has sufficient capacity`);
      return {
        success: true,
        servers: existingServers.map(id => this.activeServers.get(id)!),
        failed: [],
        estimatedCost: this.calculateCost(existingServers),
      };
    }

    // Determine instance specs based on agents per instance
    const tier = this.determineTier(request.agentsPerInstance);
    const config: InfrastructureConfig = {
      provider: "contabo",
      region: request.preferredRegions?.[0] || "EU",
      specs: tier.specs,
      image: "db1409d2-ed92-4f2f-908e-9487d5b72f31", // Ubuntu 22.04
    };

    // Provision instances in parallel
    const provisionPromises = [];
    for (let i = 0; i < neededInstances; i++) {
      const promise = this.provisionInstance(request.fleetId, config, i)
        .then(server => {
          servers.push(server);
          return server;
        })
        .catch(error => {
          failed.push({ region: config.region, error: error.message });
          return null;
        });
      
      provisionPromises.push(promise);
    }

    await Promise.all(provisionPromises);

    // Update fleet-server mapping
    const serverIds = servers.filter(s => s !== null).map(s => s!.id);
    this.fleetServerMap.set(request.fleetId, [...existingServers, ...serverIds]);

    // Save to database
    await this.saveServersToDB(request.fleetId, servers);

    const success = servers.length > 0;
    console.log(`[InfrastructureProvisioner] Provisioned ${servers.length}/${neededInstances} instances for fleet ${request.fleetId}`);

    return {
      success,
      servers,
      failed,
      estimatedCost: this.calculateCost([...existingServers, ...serverIds]),
    };
  }

  /**
   * Provision a single instance
   */
  private async provisionInstance(
    fleetId: string,
    config: InfrastructureConfig,
    index: number
  ): Promise<ProvisionedServer> {
    if (!this.contaboClient) {
      throw new Error("No cloud provider configured");
    }

    const name = `fleet-${fleetId.slice(-8)}-${index + 1}`;
    
    // Add provisioning job to queue
    const job = await this.provisioningQueue.add(
      "provision-instance",
      {
        fleetId,
        config,
        name,
        timestamp: Date.now(),
      },
      {
        jobId: `provision-${fleetId}-${index}`,
      }
    );

    // Wait for job completion (with timeout)
    const result = await job.waitUntilFinished(this.provisioningQueue.events, 300000);
    
    if (!result.success) {
      throw new Error(result.error || "Provisioning failed");
    }

    return result.server;
  }

  /**
   * Decommission servers for a fleet
   */
  async decommissionFleet(fleetId: string): Promise<void> {
    console.log(`[InfrastructureProvisioner] Decommissioning fleet ${fleetId}`);

    const serverIds = this.fleetServerMap.get(fleetId) || [];
    
    for (const serverId of serverIds) {
      const server = this.activeServers.get(serverId);
      if (server && this.contaboClient) {
        try {
          await this.contaboClient.terminateInstance(server.providerInstanceId);
          console.log(`[InfrastructureProvisioner] Terminated server ${serverId}`);
        } catch (error) {
          console.error(`[InfrastructureProvisioner] Failed to terminate ${serverId}:`, error);
        }
      }
      
      this.activeServers.delete(serverId);
    }

    this.fleetServerMap.delete(fleetId);
    
    // Update DB
    await prisma.infrastructureServer.updateMany({
      where: { fleetId },
      data: { status: "terminated", terminatedAt: new Date() },
    });
  }

  /**
   * Get available capacity for a fleet
   */
  async getAvailableCapacity(fleetId: string): Promise<{
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    servers: ProvisionedServer[];
  }> {
    const serverIds = this.fleetServerMap.get(fleetId) || [];
    const servers = serverIds
      .map(id => this.activeServers.get(id))
      .filter((s): s is ProvisionedServer => s !== undefined)
      .filter(s => s.status === "ready" || s.status === "active" || s.status === "full");

    let totalSlots = 0;
    let usedSlots = 0;

    for (const server of servers) {
      totalSlots += server.capacity.maxAgents;
      usedSlots += server.capacity.currentAgents;
    }

    return {
      totalSlots,
      usedSlots,
      availableSlots: totalSlots - usedSlots,
      servers,
    };
  }

  /**
   * Assign agents to a server
   */
  async assignAgents(serverId: string, agentCount: number): Promise<boolean> {
    const server = this.activeServers.get(serverId);
    if (!server) return false;

    const available = server.capacity.maxAgents - server.capacity.currentAgents;
    if (available < agentCount) return false;

    server.capacity.currentAgents += agentCount;
    server.capacity.availableSlots = available - agentCount;
    
    // Update status
    if (server.capacity.availableSlots === 0) {
      server.status = "full";
    } else if (server.status === "ready") {
      server.status = "active";
    }

    await this.updateServerInDB(server);
    return true;
  }

  /**
   * Release agent slots
   */
  async releaseAgents(serverId: string, agentCount: number): Promise<void> {
    const server = this.activeServers.get(serverId);
    if (!server) return;

    server.capacity.currentAgents = Math.max(0, server.capacity.currentAgents - agentCount);
    server.capacity.availableSlots = server.capacity.maxAgents - server.capacity.currentAgents;
    
    if (server.status === "full" && server.capacity.availableSlots > 0) {
      server.status = "active";
    }

    await this.updateServerInDB(server);
  }

  /**
   * Auto-scale based on demand
   */
  async autoScale(fleetId: string, policy: AutoScalingPolicy): Promise<void> {
    if (!policy.enabled) return;

    const capacity = await this.getAvailableCapacity(fleetId);
    const utilizationRate = capacity.totalSlots > 0 
      ? capacity.usedSlots / capacity.totalSlots 
      : 0;

    console.log(`[InfrastructureProvisioner] Fleet ${fleetId} utilization: ${(utilizationRate * 100).toFixed(1)}%`);

    // Scale up if needed
    if (utilizationRate > policy.scaleUp.agentRatioThreshold) {
      const currentServers = this.fleetServerMap.get(fleetId)?.length || 0;
      
      if (currentServers < policy.maxInstances) {
        console.log(`[InfrastructureProvisioner] Scaling up fleet ${fleetId}`);
        
        await this.provisionForFleet({
          fleetId,
          userId: "", // Will be fetched from fleet
          minInstances: currentServers + 1,
          maxInstances: Math.min(currentServers + 2, policy.maxInstances),
          agentsPerInstance: 50,
          priority: "normal",
        });
      }
    }

    // Scale down if underutilized
    if (utilizationRate < policy.scaleDown.agentRatioThreshold) {
      const currentServers = this.fleetServerMap.get(fleetId)?.length || 0;
      
      if (currentServers > policy.minInstances) {
        // Find an empty server to terminate
        const emptyServer = capacity.servers.find(s => s.capacity.currentAgents === 0);
        
        if (emptyServer && this.contaboClient) {
          console.log(`[InfrastructureProvisioner] Scaling down fleet ${fleetId}, terminating ${emptyServer.id}`);
          
          try {
            await this.contaboClient.terminateInstance(emptyServer.providerInstanceId);
            this.activeServers.delete(emptyServer.id);
            
            const serverIds = this.fleetServerMap.get(fleetId) || [];
            this.fleetServerMap.set(
              fleetId, 
              serverIds.filter(id => id !== emptyServer.id)
            );
          } catch (error) {
            console.error(`[InfrastructureProvisioner] Scale down failed:`, error);
          }
        }
      }
    }
  }

  /**
   * Get cost estimate for a fleet
   */
  estimateCost(fleetId: string, hours: number = 720): {
    hourly: number;
    daily: number;
    monthly: number;
  } {
    const serverIds = this.fleetServerMap.get(fleetId) || [];
    let hourly = 0;

    for (const serverId of serverIds) {
      const server = this.activeServers.get(serverId);
      if (server) {
        hourly += server.cost.hourly;
      }
    }

    return {
      hourly,
      daily: hourly * 24,
      monthly: hourly * hours,
    };
  }

  /**
   * Start the provisioning worker
   */
  private startProvisioningWorker(): void {
    this.provisioningWorker = new Worker(
      PROVISIONING_QUEUE,
      async (job: Job) => {
        const { fleetId, config, name } = job.data;
        
        console.log(`[InfraWorker] Provisioning ${name} for fleet ${fleetId}`);
        
        try {
          if (!this.contaboClient) {
            throw new Error("No cloud provider configured");
          }

          // Create instance
          const server = await this.contaboClient.createInstance(config, name);
          
          // Wait for instance to be ready
          await this.waitForInstanceReady(server.providerInstanceId);
          
          // Update server status
          server.status = "installing";
          this.activeServers.set(server.id, server);
          
          // Wait for OpenClaw installation
          await this.waitForOpenClaw(server.publicIp!);
          
          server.status = "ready";
          server.openclawConfig.installed = true;
          server.readyAt = new Date();
          
          await this.updateServerInDB(server);
          
          // Register with Fleet Manager
          await this.registerWithFleetManager(server);
          
          return { success: true, server };
          
        } catch (error: any) {
          console.error(`[InfraWorker] Provisioning failed:`, error);
          return { success: false, error: error.message };
        }
      },
      {
        connection: redisConnection as any,
        concurrency: 3,
      }
    );

    console.log("[InfrastructureProvisioner] Provisioning worker started");
  }

  /**
   * Start the health check worker
   */
  private startHealthCheckWorker(): void {
    this.healthCheckWorker = new Worker(
      HEALTH_CHECK_QUEUE,
      async (job: Job) => {
        const { serverId } = job.data;
        await this.checkServerHealth(serverId);
      },
      {
        connection: redisConnection as any,
        concurrency: 5,
      }
    );

    // Schedule health checks for all active servers
    this.scheduleHealthChecks();

    console.log("[InfrastructureProvisioner] Health check worker started");
  }

  /**
   * Wait for instance to be ready
   */
  private async waitForInstanceReady(instanceId: string, maxAttempts = 60): Promise<void> {
    if (!this.contaboClient) return;

    for (let i = 0; i < maxAttempts; i++) {
      const server = await this.contaboClient.getInstance(instanceId);
      
      if (server.status === "ready" || server.status === "active") {
        return;
      }
      
      if (server.status === "error") {
        throw new Error("Instance provisioning failed");
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
    }
    
    throw new Error("Timeout waiting for instance to be ready");
  }

  /**
   * Wait for OpenClaw installation
   */
  private async waitForOpenClaw(ip: string, maxAttempts = 60): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://${ip}:18789/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          return;
        }
      } catch {
        // Not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error("Timeout waiting for OpenClaw installation");
  }

  /**
   * Check server health
   */
  private async checkServerHealth(serverId: string): Promise<void> {
    const server = this.activeServers.get(serverId);
    if (!server || !this.contaboClient) return;

    try {
      // Get Contabo metrics
      const metrics = await this.contaboClient.getInstanceMetrics(server.providerInstanceId);
      
      // Check OpenClaw health
      const openclawHealth = await fetch(`http://${server.publicIp}:18789/health`)
        .then(r => r.ok)
        .catch(() => false);

      // Mark unhealthy if needed
      if (!openclawHealth || metrics.cpu > 95 || metrics.memory > 95) {
        console.warn(`[InfrastructureProvisioner] Server ${serverId} unhealthy`);
        server.status = "error";
        await this.updateServerInDB(server);
      }
      
    } catch (error) {
      console.error(`[InfrastructureProvisioner] Health check failed for ${serverId}:`, error);
    }
  }

  /**
   * Register server with Fleet Manager
   */
  private async registerWithFleetManager(server: ProvisionedServer): Promise<void> {
    // Add server to OpenClaw provider's instance list
    // This would integrate with the Fleet Manager
    console.log(`[InfrastructureProvisioner] Registered server ${server.id} with Fleet Manager`);
  }

  /**
   * Load existing servers from database
   */
  private async loadExistingServers(): Promise<void> {
    const servers = await prisma.infrastructureServer.findMany({
      where: { status: { not: "terminated" } },
    });

    for (const dbServer of servers) {
      const server: ProvisionedServer = {
        id: dbServer.id,
        provider: dbServer.provider as CloudProvider,
        providerInstanceId: dbServer.providerInstanceId,
        name: dbServer.name,
        status: dbServer.status as ProvisionedServer["status"],
        publicIp: dbServer.publicIp || undefined,
        hostname: dbServer.hostname,
        specs: JSON.parse(dbServer.specs as string),
        region: dbServer.region,
        openclawConfig: JSON.parse(dbServer.openclawConfig as string),
        capacity: JSON.parse(dbServer.capacity as string),
        cost: JSON.parse(dbServer.cost as string),
        createdAt: dbServer.createdAt,
        readyAt: dbServer.readyAt || undefined,
      };

      this.activeServers.set(server.id, server);
      
      const fleetServers = this.fleetServerMap.get(dbServer.fleetId) || [];
      fleetServers.push(server.id);
      this.fleetServerMap.set(dbServer.fleetId, fleetServers);
    }

    console.log(`[InfrastructureProvisioner] Loaded ${servers.length} existing servers`);
  }

  /**
   * Save servers to database
   */
  private async saveServersToDB(fleetId: string, servers: ProvisionedServer[]): Promise<void> {
    for (const server of servers) {
      await prisma.infrastructureServer.create({
        data: {
          id: server.id,
          fleetId,
          provider: server.provider,
          providerInstanceId: server.providerInstanceId,
          name: server.name,
          status: server.status,
          publicIp: server.publicIp,
          hostname: server.hostname,
          specs: JSON.stringify(server.specs),
          region: server.region,
          openclawConfig: JSON.stringify(server.openclawConfig),
          capacity: JSON.stringify(server.capacity),
          cost: JSON.stringify(server.cost),
        },
      });
    }
  }

  /**
   * Update server in database
   */
  private async updateServerInDB(server: ProvisionedServer): Promise<void> {
    await prisma.infrastructureServer.update({
      where: { id: server.id },
      data: {
        status: server.status,
        publicIp: server.publicIp,
        capacity: JSON.stringify(server.capacity),
        readyAt: server.readyAt,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Determine server tier based on agents per instance
   */
  private determineTier(agentsPerInstance: number): { specs: ServerSpecs; maxAgents: number } {
    if (agentsPerInstance <= 10) return SERVER_TIERS.small;
    if (agentsPerInstance <= 25) return SERVER_TIERS.medium;
    if (agentsPerInstance <= 50) return SERVER_TIERS.large;
    return SERVER_TIERS.xlarge;
  }

  /**
   * Calculate cost for server IDs
   */
  private calculateCost(serverIds: string[]): { hourly: number; daily: number; monthly: number } {
    let hourly = 0;
    
    for (const id of serverIds) {
      const server = this.activeServers.get(id);
      if (server) {
        hourly += server.cost.hourly;
      }
    }
    
    return {
      hourly,
      daily: hourly * 24,
      monthly: hourly * 24 * 30,
    };
  }

  /**
   * Schedule health checks for all servers
   */
  private scheduleHealthChecks(): void {
    setInterval(async () => {
      for (const serverId of this.activeServers.keys()) {
        await this.healthCheckQueue.add(
          "health-check",
          { serverId },
          { jobId: `health-${serverId}-${Date.now()}` }
        );
      }
    }, 60000); // Every minute
  }

  /**
   * Shutdown the provisioner
   */
  async shutdown(): Promise<void> {
    console.log("[InfrastructureProvisioner] Shutting down...");
    
    await this.provisioningWorker?.close();
    await this.healthCheckWorker?.close();
    await this.provisioningQueue.close();
    await this.healthCheckQueue.close();
    
    this.isInitialized = false;
    console.log("[InfrastructureProvisioner] Shutdown complete");
  }
}

// Export singleton
export const infrastructureProvisioner = InfrastructureProvisioner.getInstance();
