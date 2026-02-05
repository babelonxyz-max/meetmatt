// Devin API Integration - Service User Authentication
// Documentation: https://docs.devin.ai/

const DEVIN_API_URL = "https://api.devin.ai/v1";
const SERVICE_USER_TOKEN = process.env.DEVIN_SERVICE_USER_TOKEN || "cog_anhxbuztiihzb3nokbaxswshrq3qo7qv76xacel622zqbdwm5z7a";

interface DevinConfig {
  name: string;
  purpose: string;
  features: string[];
  tier: string;
}

interface DevinSession {
  sessionId: string;
  url: string;
  status: "pending" | "running" | "completed" | "error" | "stopped";
  createdAt: string;
}

interface DevinMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/**
 * Create a new Devin session with Service User authentication
 */
export async function createDevinSession(config: DevinConfig): Promise<DevinSession> {
  if (!SERVICE_USER_TOKEN) {
    throw new Error("DEVIN_SERVICE_USER_TOKEN not configured");
  }

  try {
    // Construct the system prompt for Matt's agent creation
    const systemPrompt = buildDevinSystemPrompt(config);

    const response = await fetch(`${DEVIN_API_URL}/session`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: systemPrompt,
        name: `Matt Agent: ${config.name}`,
        // Optional: Add knowledge base or context
        knowledge: [
          "You are an AI agent created by Matt (meetmatt.xyz)",
          `Agent name: ${config.name}`,
          `Tier: ${config.tier}`,
          "You should be helpful, professional, and efficient.",
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(`Devin API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      sessionId: data.session_id || data.id,
      url: data.url || `https://preview.devin.ai/devin/${data.session_id || data.id}`,
      status: "pending",
      createdAt: data.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to create Devin session:", error);
    throw error;
  }
}

/**
 * Get session details and status
 */
export async function getDevinSession(sessionId: string): Promise<DevinSession> {
  if (!SERVICE_USER_TOKEN) {
    throw new Error("DEVIN_SERVICE_USER_TOKEN not configured");
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/session/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${SERVICE_USER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      sessionId: data.session_id || data.id,
      url: data.url || `https://preview.devin.ai/devin/${sessionId}`,
      status: mapDevinStatus(data.status),
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Failed to get Devin session:", error);
    throw error;
  }
}

/**
 * Send a message to the Devin session
 */
export async function sendMessageToDevin(sessionId: string, message: string): Promise<void> {
  if (!SERVICE_USER_TOKEN) {
    throw new Error("DEVIN_SERVICE_USER_TOKEN not configured");
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/session/${sessionId}/message`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_USER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send message to Devin:", error);
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function getSessionMessages(sessionId: string): Promise<DevinMessage[]> {
  if (!SERVICE_USER_TOKEN) {
    throw new Error("DEVIN_SERVICE_USER_TOKEN not configured");
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/session/${sessionId}/messages`, {
      headers: {
        "Authorization": `Bearer ${SERVICE_USER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error("Failed to get session messages:", error);
    return [];
  }
}

/**
 * Stop a Devin session
 */
export async function stopDevinSession(sessionId: string): Promise<void> {
  if (!SERVICE_USER_TOKEN) {
    throw new Error("DEVIN_SERVICE_USER_TOKEN not configured");
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/session/${sessionId}/stop`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_USER_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to stop session: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to stop Devin session:", error);
    throw error;
  }
}

/**
 * Build the system prompt for agent creation
 */
function buildDevinSystemPrompt(config: DevinConfig): string {
  const featuresList = config.features.join(", ");
  
  return `Create and deploy an AI agent named "${config.name}".

PURPOSE: ${config.purpose}

CAPABILITIES: ${featuresList}

TIER: ${config.tier}

INSTRUCTIONS:
1. Set up a complete project structure
2. Implement core functionality for the stated purpose
3. Add the requested capabilities
4. Create a working API/web interface
5. Write clear documentation
6. Deploy to a publicly accessible endpoint

The agent should be production-ready and handle requests professionally.

Name all files and functions appropriately for "${config.name}".`;
}

/**
 * Map Devin API status to our internal status
 */
function mapDevinStatus(devinStatus: string): DevinSession["status"] {
  const statusMap: Record<string, DevinSession["status"]> = {
    "pending": "pending",
    "running": "running",
    "completed": "completed",
    "failed": "error",
    "error": "error",
    "stopped": "stopped",
  };
  
  return statusMap[devinStatus] || "pending";
}

/**
 * Poll for session completion with progress callback
 */
export async function pollDevinSession(
  sessionId: string,
  onStatusChange?: (status: DevinSession["status"], messages?: DevinMessage[]) => void,
  maxAttempts: number = 120,
  intervalMs: number = 5000
): Promise<DevinSession> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await getDevinSession(sessionId);
    
    // Get latest messages for context
    const messages = await getSessionMessages(sessionId);
    
    onStatusChange?.(session.status, messages);
    
    if (session.status === "completed" || session.status === "error" || session.status === "stopped") {
      return session;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error("Timeout waiting for Devin session completion");
}

// Export types
export type { DevinConfig, DevinSession, DevinMessage };
