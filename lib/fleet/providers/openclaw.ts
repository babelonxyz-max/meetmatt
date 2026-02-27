/**
 * OpenClaw Runtime Provider
 * 
 * Manages deployment and lifecycle of agents on OpenClaw instances.
 * OpenClaw runs locally or on remote machines and provides the actual
 * agent execution environment.
 */

import {
  IRuntimeProvider,
  FleetAgent,
  FleetAgentStatus,
  HealthCheckResult,
  DeploymentResult,
  FleetMetrics,
  OpenClawRuntimeConfig,
  OpenClawInstance,
  AgentTemplate,
  FLEET_CONSTANTS,
} from "../types";

// OpenClaw API Response Types
interface OpenClawSession {
  session_id: string;
  url: string;
  status: string;
  created_at: string;
}

interface OpenClawAgentConfig {
  name: string;
  model: string;
  system_prompt: string;
  capabilities: string[];
  workspace?: string;
  max_concurrent?: number;
  compaction_mode?: string;
}

export class OpenClawProvider implements IRuntimeProvider {
  readonly name = "openclaw" as const;
  
  private config: OpenClawRuntimeConfig;
  private instances: Map<string, OpenClawInstance> = new Map();
  private agentInstanceMap: Map<string, string> = new Map(); // agentId -> instanceId
  
  constructor(config: OpenClawRuntimeConfig) {
    this.config = config;
  }
  
  async initialize(config: OpenClawRuntimeConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Register all instances
    for (const instance of this.config.instances) {
      this.instances.set(instance.id, instance);
    }
    
    console.log(`[OpenClawProvider] Initialized with ${this.instances.size} instances`);
    
    // Health check all instances
    await this.healthCheckAllInstances();
  }
  
  /**
   * Deploy a single agent to an OpenClaw instance
   */
  async deployAgent(agent: FleetAgent): Promise<DeploymentResult> {
    const startTime = Date.now();
    
    try {
      // Find best instance with capacity
      const instance = await this.findBestInstance();
      
      if (!instance) {
        throw new Error("No available OpenClaw instances with capacity");
      }
      
      // Build agent configuration
      const agentConfig = this.buildAgentConfig(agent);
      
      // Create agent session on OpenClaw
      const session = await this.createAgentSession(instance, agentConfig);
      
      // Track which instance is running this agent
      this.agentInstanceMap.set(agent.id, instance.id);
      instance.currentLoad++;
      
      const duration = Date.now() - startTime;
      
      console.log(`[OpenClawProvider] Deployed agent ${agent.id} to instance ${instance.id} in ${duration}ms`);
      
      return {
        success: true,
        agentId: agent.id,
        endpoint: session.url,
        sessionId: session.session_id,
        duration,
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error(`[OpenClawProvider] Failed to deploy agent ${agent.id}:`, error);
      
      return {
        success: false,
        agentId: agent.id,
        error: error.message,
        duration,
      };
    }
  }
  
  /**
   * Stop an agent on OpenClaw
   */
  async stopAgent(agentId: string): Promise<void> {
    const instanceId = this.agentInstanceMap.get(agentId);
    
    if (!instanceId) {
      console.warn(`[OpenClawProvider] No instance found for agent ${agentId}`);
      return;
    }
    
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    try {
      // Call OpenClaw API to stop agent
      const response = await fetch(
        `${this.getInstanceUrl(instance)}/api/agents/${agentId}/stop`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${instance.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to stop agent: ${response.statusText}`);
      }
      
      // Update tracking
      instance.currentLoad = Math.max(0, instance.currentLoad - 1);
      this.agentInstanceMap.delete(agentId);
      
      console.log(`[OpenClawProvider] Stopped agent ${agentId} on instance ${instanceId}`);
      
    } catch (error) {
      console.error(`[OpenClawProvider] Error stopping agent ${agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Restart an agent
   */
  async restartAgent(agentId: string): Promise<void> {
    const instanceId = this.agentInstanceMap.get(agentId);
    
    if (!instanceId) {
      throw new Error(`No instance found for agent ${agentId}`);
    }
    
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    try {
      const response = await fetch(
        `${this.getInstanceUrl(instance)}/api/agents/${agentId}/restart`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${instance.authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to restart agent: ${response.statusText}`);
      }
      
      console.log(`[OpenClawProvider] Restarted agent ${agentId}`);
      
    } catch (error) {
      console.error(`[OpenClawProvider] Error restarting agent ${agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an agent from OpenClaw
   */
  async deleteAgent(agentId: string): Promise<void> {
    try {
      // First stop the agent
      await this.stopAgent(agentId);
      
      // Additional cleanup if needed
      console.log(`[OpenClawProvider] Deleted agent ${agentId}`);
      
    } catch (error) {
      console.error(`[OpenClawProvider] Error deleting agent ${agentId}:`, error);
      // Don't throw - agent might already be stopped
    }
  }
  
  /**
   * Check health of an agent
   */
  async checkHealth(agent: FleetAgent): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const instanceId = this.agentInstanceMap.get(agent.id);
    
    if (!instanceId) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        isHealthy: false,
        latency: 0,
        checks: {
          connection: false,
          response: false,
          memory: false,
          error: "No instance assigned",
        },
      };
    }
    
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        isHealthy: false,
        latency: 0,
        checks: {
          connection: false,
          response: false,
          memory: false,
          error: "Instance not found",
        },
      };
    }
    
    try {
      const response = await fetch(
        `${this.getInstanceUrl(instance)}/api/agents/${agent.id}/health`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${instance.authToken}`,
          },
        }
      );
      
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          isHealthy: false,
          latency,
          checks: {
            connection: true,
            response: false,
            memory: false,
            error: `Health check failed: ${response.statusText}`,
          },
        };
      }
      
      const healthData = await response.json();
      
      return {
        agentId: agent.id,
        timestamp: new Date(),
        isHealthy: healthData.healthy ?? true,
        latency,
        checks: {
          connection: true,
          response: true,
          memory: healthData.memory?.healthy ?? true,
          error: healthData.error,
        },
      };
      
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        isHealthy: false,
        latency: Date.now() - startTime,
        checks: {
          connection: false,
          response: false,
          memory: false,
          error: error.message,
        },
      };
    }
  }
  
  /**
   * Get metrics for an agent
   */
  async getMetrics(agentId: string): Promise<Partial<FleetMetrics>> {
    const instanceId = this.agentInstanceMap.get(agentId);
    
    if (!instanceId) {
      return {};
    }
    
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      return {};
    }
    
    try {
      const response = await fetch(
        `${this.getInstanceUrl(instance)}/api/agents/${agentId}/metrics`,
        {
          headers: {
            "Authorization": `Bearer ${instance.authToken}`,
          },
        }
      );
      
      if (!response.ok) {
        return {};
      }
      
      const data = await response.json();
      
      return {
        totalRequests: data.requests,
        averageResponseTime: data.avgLatency,
        errorRate: data.errorRate,
        resources: {
          cpuUsage: data.cpu,
          memoryUsage: data.memory,
        },
      };
      
    } catch (error) {
      return {};
    }
  }
  
  /**
   * Check if instance can accept more agents
   */
  canAcceptMoreAgents(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    
    if (!instance || instance.status !== "active") {
      return false;
    }
    
    return instance.currentLoad < instance.capacity;
  }
  
  /**
   * Get capacity info for an instance
   */
  getCapacity(instanceId: string): { used: number; total: number } {
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      return { used: 0, total: 0 };
    }
    
    return {
      used: instance.currentLoad,
      total: instance.capacity,
    };
  }
  
  /**
   * Get total capacity across all instances
   */
  getTotalCapacity(): { used: number; total: number; available: number } {
    let used = 0;
    let total = 0;
    
    for (const instance of this.instances.values()) {
      if (instance.status === "active") {
        used += instance.currentLoad;
        total += instance.capacity;
      }
    }
    
    return { used, total, available: total - used };
  }
  
  /**
   * Find the best instance for deploying a new agent
   */
  private async findBestInstance(): Promise<OpenClawInstance | null> {
    // Filter active instances with capacity
    const candidates = Array.from(this.instances.values())
      .filter(i => i.status === "active" && i.currentLoad < i.capacity)
      .sort((a, b) => a.currentLoad - b.currentLoad); // Least loaded first
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Verify instance is actually reachable (health check)
    for (const instance of candidates) {
      const isHealthy = await this.checkInstanceHealth(instance);
      
      if (isHealthy) {
        return instance;
      } else {
        // Mark as offline
        instance.status = "offline";
        console.warn(`[OpenClawProvider] Instance ${instance.id} marked offline due to failed health check`);
      }
    }
    
    return null;
  }
  
  /**
   * Check if an instance is healthy
   */
  private async checkInstanceHealth(instance: OpenClawInstance): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.getInstanceUrl(instance)}/health`,
        {
          headers: {
            "Authorization": `Bearer ${instance.authToken}`,
          },
        }
      );
      
      return response.ok;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Health check all instances
   */
  private async healthCheckAllInstances(): Promise<void> {
    console.log("[OpenClawProvider] Running health check on all instances...");
    
    for (const instance of this.instances.values()) {
      const isHealthy = await this.checkInstanceHealth(instance);
      
      if (isHealthy) {
        instance.status = "active";
        console.log(`[OpenClawProvider] Instance ${instance.id} is healthy (${instance.currentLoad}/${instance.capacity})`);
      } else {
        instance.status = "offline";
        console.warn(`[OpenClawProvider] Instance ${instance.id} is offline`);
      }
    }
  }
  
  /**
   * Build OpenClaw agent configuration from FleetAgent
   */
  private buildAgentConfig(agent: FleetAgent): OpenClawAgentConfig {
    const config = agent.config;
    
    return {
      name: agent.name,
      model: config.model || "qwen3-coder",
      system_prompt: config.systemPrompt || this.getDefaultSystemPrompt(config),
      capabilities: config.capabilities || [],
      workspace: config.openclawConfig?.workspace || `/workspace/${agent.id}`,
      max_concurrent: config.openclawConfig?.maxConcurrentTasks || 4,
      compaction_mode: config.openclawConfig?.compactionMode || "safeguard",
    };
  }
  
  /**
   * Create agent session on OpenClaw instance
   */
  private async createAgentSession(
    instance: OpenClawInstance,
    config: OpenClawAgentConfig
  ): Promise<OpenClawSession> {
    const response = await fetch(
      `${this.getInstanceUrl(instance)}/api/agents`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${instance.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create agent session: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      session_id: data.session_id || data.id,
      url: data.url || `${this.getInstanceUrl(instance)}/agents/${data.session_id}`,
      status: data.status || "starting",
      created_at: data.created_at || new Date().toISOString(),
    };
  }
  
  /**
   * Get full URL for an instance
   */
  private getInstanceUrl(instance: OpenClawInstance): string {
    return `http://${instance.host}:${instance.port}`;
  }
  
  /**
   * Get default system prompt based on personality
   */
  private getDefaultSystemPrompt(config: AgentTemplate): string {
    const prompts: Record<string, string> = {
      professional: `You are ${config.namePrefix}, a professional AI assistant. Be concise, formal, and helpful.`,
      friendly: `You are ${config.namePrefix}, a friendly AI companion. Be warm, conversational, and approachable.`,
      hustler: `You are ${config.namePrefix}, a direct and efficient AI. Be brief, actionable, and results-focused.`,
    };
    
    return prompts[config.personality] || prompts.professional;
  }
}
