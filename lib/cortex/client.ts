import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "./types";

type CortexGatewayRequest = {
  agentId: string;
  request: ChatCompletionRequest;
  skillSlug?: string | null;
  units?: number;
  runId?: string | null;
  userId?: string | null;
  timeoutMs?: number;
};

function getGatewayUrl(): string {
  const gatewayUrl = process.env.CORTEX_GATEWAY_URL?.trim();
  if (!gatewayUrl) {
    throw {
      status: 503,
      message: "CORTEX_GATEWAY_URL not set",
    };
  }

  return gatewayUrl.replace(/\/$/, "");
}

function normalizeUnits(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
}

async function readGatewayError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Gateway request failed (${response.status})`;
  }

  try {
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
      };
    };
    const message = parsed.error?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  } catch {
    // Fall through to raw text.
  }

  return text.slice(0, 500);
}

export async function completeViaCortexGateway(
  params: CortexGatewayRequest,
): Promise<ChatCompletionResponse> {
  const gatewayUrl = getGatewayUrl();
  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? 30_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer cortex-${params.agentId}`,
      "x-cortex-agent-id": params.agentId,
    };

    if (params.skillSlug?.trim()) {
      headers["x-matt-skill-slug"] = params.skillSlug.trim();
      headers["x-matt-skill-units"] = String(normalizeUnits(params.units));
    }
    if (params.runId?.trim()) {
      headers["x-matt-run-id"] = params.runId.trim();
    }
    if (params.userId?.trim()) {
      headers["x-matt-user-id"] = params.userId.trim();
    }

    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(params.request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw {
        status: response.status,
        message: await readGatewayError(response),
      };
    }

    return (await response.json()) as ChatCompletionResponse;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw {
        status: 504,
        message: "Cortex gateway request timed out",
      };
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}
