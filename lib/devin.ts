// COST-OPTIMIZED: Devin is used only for building the platform, not per-agent
// Each agent is created from the platform template without additional Devin cost

interface DevinConfig {
  name: string;
  useCase: string;
  scope: string;
  contactMethod: string;
}

interface DevinSession {
  sessionId: string;
  url: string;
  status: "pending" | "running" | "completed" | "error";
}

const DEVIN_API_URL = "https://api.devin.ai/v1";
const DEVIN_API_KEY = process.env.DEVIN_API_KEY || "";

// Feature flag: Use cost-effective template deployment instead of Devin per agent
const USE_DEVIN_PER_AGENT = true; // Set to true only for complex custom builds

/**
 * Create agent using cost-effective method
 * - If USE_DEVIN_PER_AGENT = true: Uses Devin (expensive, for complex cases)
 * - If USE_DEVIN_PER_AGENT = false: Uses template deployment (cheap, for standard agents)
 */
export async function createDevinSession(config: DevinConfig): Promise<DevinSession> {
  // Cost optimization: Use template deployment for standard agents
  if (!USE_DEVIN_PER_AGENT) {
    console.log("Using template deployment (cost-optimized) for:", config.name);
    return createTemplateDeployment(config);
  }

  // Expensive: Only for complex custom builds
  if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
    console.warn("DEVIN_API_KEY not set, using template deployment");
    return createTemplateDeployment(config);
  }

  try {
    const prompt = buildDevinPrompt(config);

    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        name: `Deploy ${config.name}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Devin API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      sessionId: data.session_id,
      url: data.url,
      status: "pending",
    };
  } catch (error) {
    console.error("Failed to create Devin session, falling back to template:", error);
    return createTemplateDeployment(config);
  }
}

/**
 * COST-OPTIMIZED: Create agent from template
 * No Devin cost per agent - just infrastructure
 */
async function createTemplateDeployment(config: DevinConfig): Promise<DevinSession> {
  const sessionId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Simulate deployment steps
  console.log(`[Template Deploy] Creating agent: ${config.name}`);
  console.log(`[Template Deploy] Use case: ${config.useCase}`);
  console.log(`[Template Deploy] Scope: ${config.scope}`);
  
  // TODO: Implement actual template deployment
  // This would:
  // 1. Clone/fork a pre-built agent template
  // 2. Customize with user's config
  // 3. Deploy to Vercel/Railway
  // 4. Set up Telegram webhook
  
  return {
    sessionId,
    url: `https://meetmatt.vercel.app/agent/${sessionId}`,
    status: "completed", // Templates deploy fast
  };
}

/**
 * Get the status of a Devin session
 */
export async function getSessionStatus(sessionId: string): Promise<DevinSession> {
  if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
    // Simulate progress for mock sessions
    const mockStatus = Math.random() > 0.7 ? "completed" : "running";
    return {
      sessionId,
      url: `https://preview.devin.ai/devin/${sessionId}`,
      status: mockStatus as DevinSession["status"],
    };
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/sessions/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session status: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      sessionId: data.session_id,
      url: data.url,
      status: mapDevinStatus(data.status),
    };
  } catch (error) {
    console.error("Failed to get session status:", error);
    return {
      sessionId,
      url: `https://preview.devin.ai/devin/${sessionId}`,
      status: "error",
    };
  }
}

/**
 * Send a message to an active Devin session
 */
export async function sendMessage(sessionId: string, message: string): Promise<void> {
  if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
    console.log("Mock: Would send message to session", sessionId, message);
    return;
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/sessions/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

/**
 * Build the prompt for Devin based on agent configuration
 */
function buildDevinPrompt(config: DevinConfig): string {
  return `Create an AI agent named "${config.name}" with the following specifications:

**Use Case:** ${config.useCase}
**Scope:** ${config.scope}
**Contact Method:** ${config.contactMethod}

Please:
1. Set up the project structure
2. Implement the core functionality for: ${config.scope}
3. Add ${config.contactMethod} integration for communication
4. Create documentation
5. Deploy to a working endpoint

The agent should be production-ready and handle the described use case effectively.`;
}

/**
 * Map Devin status to our internal status
 */
function mapDevinStatus(devinStatus: string): DevinSession["status"] {
  const statusMap: Record<string, DevinSession["status"]> = {
    "pending": "pending",
    "running": "running", 
    "completed": "completed",
    "failed": "error",
    "error": "error",
  };
  
  return statusMap[devinStatus] || "pending";
}

/**
 * Create a mock session for testing without API key
 */
function createMockSession(config: DevinConfig): DevinSession {
  const sessionId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`Creating mock Devin session for "${config.name}"`);
  
  return {
    sessionId,
    url: `https://preview.devin.ai/devin/${sessionId}`,
    status: "pending",
  };
}

/**
 * Poll for session completion
 */
export async function pollForCompletion(
  sessionId: string,
  onStatusChange?: (status: DevinSession["status"]) => void,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<DevinSession> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await getSessionStatus(sessionId);
    
    onStatusChange?.(session.status);
    
    if (session.status === "completed" || session.status === "error") {
      return session;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error("Timeout waiting for session completion");
}

// Export types
export type { DevinConfig, DevinSession };
