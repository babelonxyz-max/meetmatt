import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Boxes,
  Building2,
  Home,
  LogOut,
  ShieldCheck,
  Waves,
} from "lucide-react";
import {
  OPS_SESSION_COOKIE,
  getOpsSessionExpiryDate,
  verifyOpsSessionValue,
} from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

function formatExpiry(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OpsProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = verifyOpsSessionValue(
    cookieStore.get(OPS_SESSION_COOKIE)?.value,
  );

  if (!session) {
    redirect("/ops/login");
  }

  return (
    <div className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(6,16,30,0.96),rgba(8,28,44,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-6 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Matt Ops Console
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Operate the revenue path, not the old backoffice.
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                    This surface is for running Matt relationships, Telethon transport,
                    task queues, payments, and deployment health. It stays intentionally
                    thin so it matches the current product direction.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Session expires
                  </div>
                  <div className="mt-1 font-medium text-white">
                    {formatExpiry(getOpsSessionExpiryDate(session))}
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  Customer Dashboard
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/ops"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  Ops Overview
                  <Home className="h-4 w-4" />
                </Link>

                <Link
                  href="/ops/platform"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  Platform
                  <Building2 className="h-4 w-4" />
                </Link>

                <Link
                  href="/ops/telegram-inventory"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                >
                  Telegram Inventory
                  <Boxes className="h-4 w-4" />
                </Link>

                <form action="/api/ops/session" method="post">
                  <input type="hidden" name="action" value="logout" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:border-red-400/35 hover:bg-red-500/15"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Focus
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Relationship continuity, fast issue ownership, and reliable handoff to
                  the hidden fleet.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Surface
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Telethon identities, Matt assignments, open tickets, deploy jobs,
                  outbound queue, capability loadouts, workspaces, and warm bot inventory.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <Waves className="h-3.5 w-3.5" />
                  Principle
                </div>
                <div className="mt-2 text-sm text-slate-200">
                  Keep the public offer simple. Use internal complexity only where it
                  improves support, continuity, or delivery.
                </div>
              </div>
            </div>
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}
