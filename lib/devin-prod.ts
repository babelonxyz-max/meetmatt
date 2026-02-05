import { prisma } from "./prisma";
import { logger } from "./logger";

const DEVIN_API_URL = "https://api.devin.ai/v1";

interface DevinSession {
  sessionId: string;
  url: string;
  status: string;
}

interface DeploymentConfig {
  name: string;
  purpose: string;
  features: string[];
  type: string;
  userId: string;
}

// Create a new Devin session for agent deployment
export async function createDeploymentSession(
  config: DeploymentConfig
): Promise<DevinSession | null> {
  try {
    const prompt = buildDeploymentPrompt(config);

    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        name: `Deploy ${config.name}`,
        idle_timeout_seconds: 3600, // 1 hour
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Devin API error:", { error, status: response.status });
      throw new Error(`Devin API error: ${response.status}`);
    }

    const data = await response.json();

    logger.info("Devin session created:", {
      sessionId: data.session_id,
      name: config.name,
    });

    return {
      sessionId: data.session_id,
      url: data.url,
      status: data.status,
    };
  } catch (error) {
    logger.error("Error creating Devin session:", { error });
    return null;
  }
}

// Build deployment prompt for Devin
function buildDeploymentPrompt(config: DeploymentConfig): string {
  const featuresList = config.features.map((f) => `- ${f}`).join("\n");

  return `
Deploy an AI agent named "${config.name}" with the following specifications:

## Purpose
${config.purpose}

## Agent Type
${config.type}

## Features
${featuresList}

## Requirements
1. Create a complete, working AI agent system
2. Include all necessary configuration files
3. Set up proper error handling and logging
4. Create deployment documentation
5. Include example usage code

## Deliverables
1. Main agent code (Python/Node.js)
2. Configuration files
3. README with setup instructions
4. Example usage scripts
5. API documentation

Please create this in a well-organized project structure.
`.trim();
}

// Poll Devin session status
export async function pollSessionStatus(
  sessionId: string,
  agentId: string,
  maxAttempts = 60
): Promise<void> {
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      logger.warn("Max polling attempts reached:", { sessionId, agentId });
      await updateAgentStatus(agentId, "error");
      return;
    }

    attempts++;

    try {
      const response = await fetch(
        `${DEVIN_API_URL}/sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      // Log deployment status
      await prisma.deploymentLog.create({
        data: {
          agentId,
          status: data.status,
          message: `Polling attempt ${attempts}: ${data.status}`,
          details: JSON.stringify(data),
        },
      });

      // Update agent status based on Devin status
      if (data.status === "running") {
        await updateAgentStatus(agentId, "running", {
          devinUrl: data.url,
        });
        return;
      } else if (data.status === "stopped" || data.status === "error") {
        await updateAgentStatus(agentId, "error");
        return;
      }

      // Continue polling
      setTimeout(poll, 30000); // Poll every 30 seconds
    } catch (error) {
      logger.error("Error polling Devin session:", { error, sessionId });
      setTimeout(poll, 30000);
    }
  };

  poll();
}

// Update agent status in database
async function updateAgentStatus(
  agentId: string,
  status: string,
  data?: { devinUrl?: string }
) {
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: status as any,
        ...(data?.devinUrl && { devinUrl: data.devinUrl }),
        ...(status === "running" && { deployedAt: new Date() }),
      },
    });
  } catch (error) {
    logger.error("Error updating agent status:", { error, agentId });
  }
}

// Send message to active Devin session
export async function sendMessageToSession(
  sessionId: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${DEVIN_API_URL}/sessions/${sessionId}/message`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      }
    );

    return response.ok;
  } catch (error) {
    logger.error("Error sending message to Devin:", { error, sessionId });
    return false;
  }
}

// Stop Devin session
export async function stopSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${DEVIN_API_URL}/sessions/${sessionId}/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    logger.error("Error stopping Devin session:", { error, sessionId });
    return false;
  }
}

// Get session details
export async function getSessionDetails(
  sessionId: string
): Promise<any | null> {
  try {
    const response = await fetch(
      `${DEVIN_API_URL}/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEVIN_API_KEY}`,
        },
      }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    logger.error("Error getting session details:", { error, sessionId });
    return null;
  }
}

// Start deployment process
export async function startDeployment(
  config: DeploymentConfig
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  try {
    // Create agent record
    const agent = await prisma.agent.create({
      data: {
        userId: config.userId,
        name: config.name,
        slug: config.name.toLowerCase().replace(/\s+/g, "-"),
        purpose: config.purpose,
        features: config.features,
        type: config.type,
        status: "deploying",
      },
    });

    // Create Devin session
    const session = await createDeploymentSession(config);

    if (!session) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: "error" },
      });
      return { success: false, error: "Failed to create Devin session" };
    }

    // Update agent with Devin session info
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        devinSessionId: session.sessionId,
        devinUrl: session.url,
      },
    });

    // Start polling in background
    pollSessionStatus(session.sessionId, agent.id);

    return { success: true, agentId: agent.id };
  } catch (error) {
    logger.error("Error starting deployment:", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
