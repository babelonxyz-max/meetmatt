import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, KeyRound, Shield } from "lucide-react";
import {
  OPS_SESSION_COOKIE,
  sanitizeOpsNextPath,
  verifyOpsSessionValue,
} from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: SearchParams, key: string): string | null {
  const value = params[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function readErrorMessage(error: string | null) {
  if (error === "invalid") {
    return "The admin token did not match `ADMIN_AUTH_TOKEN`.";
  }
  if (error === "unconfigured") {
    return "Ops login is unavailable until `ADMIN_AUTH_TOKEN` is configured.";
  }
  return null;
}

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const session = verifyOpsSessionValue(
    cookieStore.get(OPS_SESSION_COOKIE)?.value,
  );

  if (session) {
    redirect("/ops");
  }

  const nextPath = sanitizeOpsNextPath(readSearchParam(params, "next"));
  const errorMessage = readErrorMessage(readSearchParam(params, "error"));
  const isConfigured = Boolean(process.env.ADMIN_AUTH_TOKEN?.trim());

  return (
    <div className="px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(6,16,30,0.95),rgba(4,12,24,0.9))] shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <div className="space-y-8 px-6 py-8 sm:px-8 sm:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-cyan-200">
              <Shield className="h-3.5 w-3.5" />
              Internal Ops
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Keep Matt support live, reliable, and paid.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                This login opens the thin operating surface for Matt relationships,
                Telethon identities, payment-to-deployment flow, and queue health.
                It is intentionally not exposed in the public navigation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Relationship layer
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  See who owns each customer thread and whether Matt support is seeded.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Transport health
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Inspect Telethon identities, bindings, and outbound queue pressure.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Money path
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Track recent payments and deploy jobs so revenue does not stall in ops.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                <KeyRound className="h-3.5 w-3.5" />
                Admin token
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Sign in to Ops
              </h2>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Use the current `ADMIN_AUTH_TOKEN` value. Sessions are stored as an
                HttpOnly cookie and expire automatically.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {!isConfigured ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  `ADMIN_AUTH_TOKEN` is missing
                </div>
                <p className="mt-2 text-amber-50/90">
                  Set the env var before using the ops surface. Without it, the login
                  route cannot mint a session cookie safely.
                </p>
              </div>
            ) : (
              <form action="/api/ops/session" method="post" className="space-y-4">
                <input type="hidden" name="next" value={nextPath} />
                <div className="space-y-2">
                  <label
                    htmlFor="token"
                    className="text-sm font-medium text-[var(--foreground)]"
                  >
                    Admin token
                  </label>
                  <input
                    id="token"
                    name="token"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15"
                    placeholder="Paste ADMIN_AUTH_TOKEN"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Shield className="h-4 w-4" />
                  Open Ops Console
                </button>
              </form>
            )}

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-4 text-sm leading-6 text-[var(--muted)]">
              <div className="font-medium text-[var(--foreground)]">Scope</div>
              <p className="mt-2">
                This is for internal operation only. The public story stays simple while
                the internal stack handles Matt relationships, tasking, and premium
                runtime orchestration.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center text-sm text-cyan-300 transition hover:text-cyan-200"
            >
              Back to public site
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
