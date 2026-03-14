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
    return "The token did not match the current Planck HQ admin secret.";
  }
  if (error === "unconfigured") {
    return "Planck HQ login is unavailable until `ADMIN_AUTH_TOKEN` is configured.";
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
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-100">
              <Shield className="h-3.5 w-3.5" />
              Planck HQ
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Enter the operating deck for launches, runtime, and inventory.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Planck HQ is the internal surface for fee overrides, manual
                activations, customer support pressure, Telegram transport, and
                warm-stock provisioning. It stays outside the public story on purpose.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Launch desk
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Adjust billing, waive fees, and activate customer agents without
                  waiting on external checkout.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Runtime health
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Inspect Telethon identities, bindings, deploy queue, and outbound
                  pressure before customers feel it.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Inventory
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Manage warm BotFather stock, 17-seat packs, and assignment flow into
                  Planck workspaces.
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
                Sign in to Planck HQ
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
                  Open Planck HQ
                </button>
              </form>
            )}

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-4 text-sm leading-6 text-[var(--muted)]">
              <div className="font-medium text-[var(--foreground)]">Scope</div>
              <p className="mt-2">
                This is for internal operation only. Planck HQ owns launch exceptions,
                runtime repair, and stock management so the public product can stay
                simple.
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
