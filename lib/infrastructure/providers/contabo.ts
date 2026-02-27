/**
 * Contabo Cloud API Client
 * 
 * Provisions VPS instances on Contabo for OpenClaw runtime.
 * Docs: https://api.contabo.com/
 */

import { 
  ContaboConfig, 
  InfrastructureConfig, 
  ProvisionedServer,
  ServerSpecs,
  ContaboInstanceResponse,
  CloudInstanceType,
} from "../types";

export class ContaboClient {
  private config: ContaboConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: ContaboConfig) {
    this.config = {
      apiUrl: config.apiUrl || "https://api.contabo.com",
      ...config,
    };
  }

  /**
   * Authenticate with Contabo API
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.config.apiUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: this.config.apiUser,
        password: this.config.apiPassword,
        grant_type: "password",
      }),
    });

    if (!response.ok) {
      throw new Error(`Contabo auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Make authenticated request to Contabo API
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-request-id": crypto.randomUUID(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Contabo API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List available instance types
   */
  async listInstanceTypes(): Promise<CloudInstanceType[]> {
    // Contabo product IDs for VPS
    // These would typically come from their API, but we'll define common ones
    const products = [
      {
        id: "VPS_1",
        name: "VPS S",
        specs: { vcpu: 4, memoryGb: 8, storageGb: 50, storageType: "ssd" as const },
        price: { hourly: 0.007, monthly: 4.99 },
        regions: ["EU", "US", "UK", "SG"],
      },
      {
        id: "VPS_2",
        name: "VPS M",
        specs: { vcpu: 6, memoryGb: 16, storageGb: 100, storageType: "ssd" as const },
        price: { hourly: 0.014, monthly: 9.99 },
        regions: ["EU", "US", "UK", "SG"],
      },
      {
        id: "VPS_3",
        name: "VPS L",
        specs: { vcpu: 8, memoryGb: 30, storageGb: 200, storageType: "ssd" as const },
        price: { hourly: 0.028, monthly: 19.99 },
        regions: ["EU", "US", "UK", "SG"],
      },
      {
        id: "VPS_4",
        name: "VPS XL",
        specs: { vcpu: 10, memoryGb: 60, storageGb: 400, storageType: "ssd" as const },
        price: { hourly: 0.056, monthly: 39.99 },
        regions: ["EU", "US", "UK", "SG"],
      },
      {
        id: "VPS_5",
        name: "VPS XXL",
        specs: { vcpu: 12, memoryGb: 120, storageGb: 800, storageType: "ssd" as const },
        price: { hourly: 0.111, monthly: 79.99 },
        regions: ["EU", "US", "UK", "SG"],
      },
    ];

    return products.map(p => ({
      ...p,
      provider: "contabo" as const,
      available: true,
    }));
  }

  /**
   * Create a new VPS instance
   */
  async createInstance(
    config: InfrastructureConfig,
    name: string
  ): Promise<ProvisionedServer> {
    // Map specs to Contabo product
    const productId = this.mapSpecsToProduct(config.specs);
    
    // Default to Ubuntu 22.04 if not specified
    const imageId = config.image || "db1409d2-ed92-4f2f-908e-9487d5b72f31";
    
    const payload = {
      displayName: name,
      productId,
      region: config.region,
      imageId,
      addOns: [],
      userData: config.startupScript || this.getDefaultCloudInit(),
    };

    const response = await this.request<{ data: ContaboInstanceResponse[] }>(
      "/v1/compute/instances",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const instance = response.data[0];
    
    return this.mapInstanceToServer(instance);
  }

  /**
   * Get instance details
   */
  async getInstance(instanceId: string): Promise<ProvisionedServer> {
    const response = await this.request<{ data: ContaboInstanceResponse[] }>(
      `/v1/compute/instances/${instanceId}`
    );
    
    return this.mapInstanceToServer(response.data[0]);
  }

  /**
   * List all instances
   */
  async listInstances(): Promise<ProvisionedServer[]> {
    const response = await this.request<{ data: ContaboInstanceResponse[] }>(
      "/v1/compute/instances"
    );
    
    return response.data.map(i => this.mapInstanceToServer(i));
  }

  /**
   * Terminate an instance
   */
  async terminateInstance(instanceId: string): Promise<void> {
    await this.request(
      `/v1/compute/instances/${instanceId}`,
      { method: "DELETE" }
    );
  }

  /**
   * Start an instance
   */
  async startInstance(instanceId: string): Promise<void> {
    await this.request(
      `/v1/compute/instances/${instanceId}/actions/start`,
      { method: "POST" }
    );
  }

  /**
   * Stop an instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    await this.request(
      `/v1/compute/instances/${instanceId}/actions/stop`,
      { method: "POST" }
    );
  }

  /**
   * Reinstall instance with new image
   */
  async reinstallInstance(
    instanceId: string, 
    imageId: string,
    userData?: string
  ): Promise<void> {
    await this.request(
      `/v1/compute/instances/${instanceId}/actions/reinstall`,
      {
        method: "POST",
        body: JSON.stringify({
          imageId,
          userData: userData || this.getDefaultCloudInit(),
        }),
      }
    );
  }

  /**
   * Get instance metrics (CPU, memory, disk)
   */
  async getInstanceMetrics(instanceId: string): Promise<{
    cpu: number;
    memory: number;
    disk: number;
  }> {
    const response = await this.request<{
      data: {
        cpuUtilization?: { percent: number };
        memoryUtilization?: { percent: number };
        diskUtilization?: { percent: number };
      };
    }>(`/v1/compute/instances/${instanceId}/metrics`);

    return {
      cpu: response.data?.cpuUtilization?.percent || 0,
      memory: response.data?.memoryUtilization?.percent || 0,
      disk: response.data?.diskUtilization?.percent || 0,
    };
  }

  /**
   * Map Contabo instance to our ProvisionedServer format
   */
  private mapInstanceToServer(instance: ContaboInstanceResponse): ProvisionedServer {
    const maxAgents = this.calculateMaxAgents(instance.ramMb, instance.cpuCores);
    
    return {
      id: `contabo-${instance.instanceId}`,
      provider: "contabo",
      providerInstanceId: instance.instanceId.toString(),
      name: instance.productName,
      status: this.mapContaboStatus(instance.status),
      publicIp: instance.ipConfig?.v4?.ip,
      hostname: `contabo-${instance.instanceId}.local`,
      specs: {
        vcpu: instance.cpuCores,
        memoryGb: Math.round(instance.ramMb / 1024),
        storageGb: Math.round(instance.diskMb / 1024),
        storageType: "ssd",
      },
      region: instance.region,
      openclawConfig: {
        installed: false,
        port: 18789,
        authToken: this.generateAuthToken(),
        maxAgents,
      },
      capacity: {
        maxAgents,
        currentAgents: 0,
        availableSlots: maxAgents,
      },
      cost: {
        hourly: this.estimateHourlyCost(instance.productId),
        currency: "USD",
      },
      createdAt: new Date(instance.createdDate),
    };
  }

  /**
   * Map specs to Contabo product ID
   */
  private mapSpecsToProduct(specs: ServerSpecs): string {
    // Find best matching product
    if (specs.memoryGb <= 8) return "VPS_1";
    if (specs.memoryGb <= 16) return "VPS_2";
    if (specs.memoryGb <= 30) return "VPS_3";
    if (specs.memoryGb <= 60) return "VPS_4";
    return "VPS_5";
  }

  /**
   * Calculate max agents based on resources
   * Rough estimate: 1 agent per 200MB RAM + 0.1 vCPU
   */
  private calculateMaxAgents(ramMb: number, cpuCores: number): number {
    const ramBased = Math.floor(ramMb / 200);
    const cpuBased = Math.floor(cpuCores * 10);
    return Math.min(ramBased, cpuBased, 100); // Max 100 per instance
  }

  /**
   * Estimate hourly cost from product ID
   */
  private estimateHourlyCost(productId: string): number {
    const prices: Record<string, number> = {
      "VPS_1": 0.007,
      "VPS_2": 0.014,
      "VPS_3": 0.028,
      "VPS_4": 0.056,
      "VPS_5": 0.111,
    };
    return prices[productId] || 0.028;
  }

  /**
   * Map Contabo status to our status
   */
  private mapContaboStatus(contaboStatus: string): ProvisionedServer["status"] {
    const mapping: Record<string, ProvisionedServer["status"]> = {
      "creating": "provisioning",
      "running": "ready",
      "stopped": "decommissioning",
      "error": "error",
      "installing": "installing",
    };
    return mapping[contaboStatus.toLowerCase()] || "provisioning";
  }

  /**
   * Generate a random auth token for OpenClaw
   */
  private generateAuthToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Get default cloud-init script for OpenClaw installation
   */
  private getDefaultCloudInit(): string {
    return `#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y curl wget git docker.io docker-compose

# Start Docker
systemctl enable docker
systemctl start docker

# Create OpenClaw user
useradd -m -s /bin/bash openclaw || true
usermod -aG docker openclaw

# Install OpenClaw (this would be your actual installation script)
cd /opt
mkdir -p openclaw
cd openclaw

# Download and install OpenClaw
# This is a placeholder - replace with actual installation
curl -fsSL https://install.openclaw.io | bash

# Configure OpenClaw as a service
cat > /etc/systemd/system/openclaw.service << 'EOF'
[Unit]
Description=OpenClaw Runtime
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=openclaw
WorkingDirectory=/opt/openclaw
ExecStart=/usr/local/bin/openclaw start
ExecStop=/usr/local/bin/openclaw stop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable openclaw
systemctl start openclaw

# Configure firewall
ufw allow 18789/tcp
ufw allow 22/tcp
ufw --force enable

# Signal completion
touch /opt/openclaw/.installed
echo "OpenClaw installation completed" >> /var/log/openclaw-install.log
`;
  }
}
