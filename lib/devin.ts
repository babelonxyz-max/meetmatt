// Devin API Integration for AI Agent Deployment
// Documentation: https://docs.devin.ai/

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

/**
 * Create a new Devin session for deploying an AI agent
 */
export async function createDevinSession(config: DevinConfig): Promise<DevinSession> {
  if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
    console.warn("DEVIN_API_KEY not set, using mock session");
    return createMockSession(config);
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
    console.error("Failed to create Devin session:", error);
    return createMockSession(config);
  }
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
