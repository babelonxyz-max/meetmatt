import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type DeployProvider = "devin" | "openclaw";

type OpenClawAgentRecord = {
  id: string;
  workspace?: string;
  model?: string;
};

type OpenClawAddResponse = {
  agentId: string;
  workspace: string;
  model: string;
};

export interface OpenClawSession {
  sessionId: string;
  url: string;
  status: "completed";
  openclawAgentId: string;
  workspace: string;
  model: string;
}

interface OpenClawConfig {
  agentId: string;
  name: string;
}

function normalizeOpenClawAgentId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getProviderFromEnv(): DeployProvider | null {
  const raw = (process.env.MEETMATT_DEPLOY_PROVIDER || "").trim().toLowerCase();
  if (!raw) {
    return null;
  }
  return normalizeDeployProvider(raw);
}

function normalizeDeployProvider(raw?: string | null): DeployProvider | null {
  const normalized = (raw || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized === "openclaw" ||
    normalized === "reallyopenclaw" ||
    normalized === "really-openclaw"
  ) {
    return "openclaw";
  }
  if (normalized === "devin") {
    return "devin";
  }
  return null;
}

function getOpenClawTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.OPENCLAW_AGENT_ADD_TIMEOUT_MS || "60000", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 60000;
  }
  return parsed;
}

function getOpenClawRunnerTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.OPENCLAW_RUNNER_TIMEOUT_MS || "20000", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20000;
  }
  return parsed;
}

function getOpenClawRunnerUrl(): string | null {
  const raw = process.env.OPENCLAW_RUNNER_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}

function getOpenClawRunnerPath(): string {
  const raw = process.env.OPENCLAW_RUNNER_DEPLOY_PATH?.trim();
  if (!raw) {
    return "/v1/openclaw/deploy";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function getOpenClawRunnerAuthHeaders(): Record<string, string> {
  const token = process.env.OPENCLAW_RUNNER_TOKEN?.trim();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
    "x-openclaw-token": token,
  };
}

function isAgentAlreadyExistsError(error: unknown): boolean {
  const stderr = String((error as { stderr?: string } | undefined)?.stderr || "");
  const message = String((error as { message?: string } | undefined)?.message || "");
  const haystack = `${stderr}\n${message}`.toLowerCase();
  return haystack.includes("already exists");
}

type OpenClawRunnerResponse = Partial<{
  openclawAgentId: string;
  agentId: string;
  sessionId: string;
  url: string;
  workspace: string;
  model: string;
  status: "completed";
}>;

function pickAgentId(response: OpenClawRunnerResponse): string {
  return (
    response.openclawAgentId ||
    response.agentId ||
    response.sessionId ||
    ""
  );
}

async function createOpenClawSessionViaRunner(
  config: OpenClawConfig,
  model: string,
  workspaceRoot: string,
): Promise<OpenClawSession> {
  const runnerBaseUrl = getOpenClawRunnerUrl();
  if (!runnerBaseUrl) {
    throw new Error("OPENCLAW_RUNNER_URL is missing");
  }

  const runnerUrl = `${runnerBaseUrl}${getOpenClawRunnerPath()}`;
  const openclawAgentId = buildAgentSeed(config);
  const workspace = path.join(workspaceRoot, openclawAgentId);
  const timeoutMs = getOpenClawRunnerTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(runnerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getOpenClawRunnerAuthHeaders(),
      },
      body: JSON.stringify({
        agentId: config.agentId,
        agentName: config.name,
        openclawAgentId,
        workspace,
        model,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenClaw runner request failed (${response.status}): ${details}`);
    }

    const parsed = (await response.json()) as OpenClawRunnerResponse;
    const resolvedId = pickAgentId(parsed) || openclawAgentId;

    return {
      sessionId: parsed.sessionId || resolvedId,
      url: parsed.url || buildDashboardUrl(resolvedId),
      status: "completed",
      openclawAgentId: resolvedId,
      workspace: parsed.workspace || workspace,
      model: parsed.model || model,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function listOpenClawAgents(openclawBin: string, timeoutMs: number): Promise<OpenClawAgentRecord[]> {
  const { stdout } = await execFileAsync(openclawBin, ["agents", "list", "--json"], {
    env: process.env,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as OpenClawAgentRecord[];
  return Array.isArray(parsed) ? parsed : [];
}

function buildDashboardUrl(openclawAgentId: string): string {
  const configured = process.env.OPENCLAW_DASHBOARD_URL?.trim();
  const base = (configured && configured.length > 0 ? configured : "http://127.0.0.1:18789").replace(/\/$/, "");
  return `${base}/?agent=${encodeURIComponent(openclawAgentId)}`;
}

function buildAgentSeed(config: OpenClawConfig): string {
  const prefix = process.env.OPENCLAW_AGENT_PREFIX || "meetmatt-";
  const byId = `${prefix}${config.agentId}`;
  const normalized = normalizeOpenClawAgentId(byId);
  if (normalized.length > 0) {
    return normalized;
  }
  return normalizeOpenClawAgentId(`${prefix}${config.name}`);
}

export function resolveDeployProvider(
  useCase: string,
  deploymentProvider?: string | null,
): DeployProvider {
  const fromEnv = getProviderFromEnv();
  if (fromEnv) {
    return fromEnv;
  }
  const explicit = normalizeDeployProvider(deploymentProvider);
  if (explicit) {
    return explicit;
  }
  return "openclaw";
}

export async function createOpenClawSession(config: OpenClawConfig): Promise<OpenClawSession> {
  const timeoutMs = getOpenClawTimeoutMs();
  const openclawBin = process.env.OPENCLAW_BIN || "openclaw";
  const model = process.env.OPENCLAW_AGENT_MODEL || "ollama/qwen3-coder";
  const workspaceRoot =
    process.env.OPENCLAW_WORKSPACE_ROOT || path.join(os.homedir(), ".openclaw", "workspace-meetmatt");

  if (getOpenClawRunnerUrl()) {
    return createOpenClawSessionViaRunner(config, model, workspaceRoot);
  }

  const openclawAgentId = buildAgentSeed(config);
  const workspace = path.join(workspaceRoot, openclawAgentId);

  const args = [
    "agents",
    "add",
    openclawAgentId,
    "--workspace",
    workspace,
    "--non-interactive",
    "--model",
    model,
    "--json",
  ];

  try {
    const { stdout } = await execFileAsync(openclawBin, args, {
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    const added = JSON.parse(stdout) as OpenClawAddResponse;
    return {
      sessionId: added.agentId,
      url: buildDashboardUrl(added.agentId),
      status: "completed",
      openclawAgentId: added.agentId,
      workspace: added.workspace,
      model: added.model || model,
    };
  } catch (error) {
    if (!isAgentAlreadyExistsError(error)) {
      throw error;
    }

    const agents = await listOpenClawAgents(openclawBin, timeoutMs);
    const existing = agents.find((agent) => agent.id === openclawAgentId);
    if (!existing) {
      throw error;
    }

    return {
      sessionId: existing.id,
      url: buildDashboardUrl(existing.id),
      status: "completed",
      openclawAgentId: existing.id,
      workspace: existing.workspace || workspace,
      model: existing.model || model,
    };
  }
}
