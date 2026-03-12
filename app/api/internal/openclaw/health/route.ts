import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/crypto-utils";
import { getErrorMessage } from "@/lib/http-error";

const execFileAsync = promisify(execFile);

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isAuthorized(req: NextRequest): boolean {
  const internalSecret = req.headers.get("x-internal-secret");
  if (
    process.env.INTERNAL_WEBHOOK_SECRET &&
    safeCompare(internalSecret ?? "", process.env.INTERNAL_WEBHOOK_SECRET)
  ) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    safeCompare(authHeader ?? "", `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return true;
  }

  return false;
}

function getRunnerHeaders(): Record<string, string> {
  const token = process.env.OPENCLAW_RUNNER_TOKEN?.trim();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
    "x-openclaw-token": token,
  };
}

async function checkRunnerHealth(baseUrl: string): Promise<Record<string, unknown>> {
  const timeoutMs = parsePositiveInt(process.env.OPENCLAW_RUNNER_TIMEOUT_MS, 20_000);
  const path = (process.env.OPENCLAW_RUNNER_HEALTH_PATH || "/v1/openclaw/health").trim();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getRunnerHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Runner health failed (${response.status}): ${text}`);
    }

    const payload = await response.json().catch(() => ({}));
    return {
      ok: true,
      mode: "runner",
      runnerUrl: baseUrl,
      ...payload,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkLocalHealth(): Promise<Record<string, unknown>> {
  const openclawBin = process.env.OPENCLAW_BIN || "openclaw";
  const timeoutMs = parsePositiveInt(process.env.OPENCLAW_AGENT_ADD_TIMEOUT_MS, 60_000);
  const { stdout } = await execFileAsync(openclawBin, ["health", "--json"], {
    env: process.env,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });

  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  return {
    ok: true,
    mode: "local",
    ...parsed,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runnerUrl = process.env.OPENCLAW_RUNNER_URL?.trim();
    const payload = runnerUrl
      ? await checkRunnerHealth(runnerUrl)
      : await checkLocalHealth();
    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("[OpenClaw/Health] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error, "Health check failed"),
      },
      { status: 500 },
    );
  }
}
