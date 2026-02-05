// Shared types across all services

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Payment Types
export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  provider: string;
  providerPaymentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

// Agent Types
export interface Agent {
  id: string;
  userId: string;
  name: string;
  useCase: string;
  scope: string[];
  contactMethod: string;
  status: "pending" | "deploying" | "active" | "error";
  devinSessionId?: string;
  devinUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeployAgentRequest {
  userId: string;
  name: string;
  useCase: string;
  scope: string[];
  contactMethod: string;
}

// Event Types
export interface ServiceEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  service: string;
}

export interface PaymentCompletedEvent extends ServiceEvent {
  type: "payment.completed";
  payload: {
    paymentId: string;
    userId: string;
    amount: number;
    agentConfig?: DeployAgentRequest;
  };
}

export interface AgentDeployedEvent extends ServiceEvent {
  type: "agent.deployed";
  payload: {
    agentId: string;
    userId: string;
    devinUrl: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Queue Job Types
export interface PaymentProcessingJob {
  paymentId: string;
  retries: number;
}

export interface AgentDeploymentJob {
  agentId: string;
  userId: string;
  config: DeployAgentRequest;
}
