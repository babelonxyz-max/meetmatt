import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  LogOut,
  Orbit,
  ShieldCheck,
} from "lucide-react";
import {
  OPS_SESSION_COOKIE,
  getOpsSessionExpiryDate,
  verifyOpsSessionValue,
} from "@/lib/ops-auth";
import { OpsSidebarNav } from "@/app/ops/(protected)/_components/OpsSidebarNav";

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
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const session = verifyOpsSessionValue(
    cookieStore.get(OPS_SESSION_COOKIE)?.value,
  );

  if (!session) {
    redirect("/ops/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,208,120,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(76,180,255,0.12),transparent_26%),linear-gradient(180deg,rgba(9,12,20,1),rgba(12,16,28,1))] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1580px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,27,0.96),rgba(11,14,24,0.94))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Planck HQ
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-white">
                    Internal operating deck
                  </h1>
                  <p className="text-sm leading-6 text-slate-300">
                    Use this shell for launches, payment exceptions, operator inventory,
                    runtime queues, and deep recovery controls.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <Orbit className="h-3.5 w-3.5" />
                  Session
                </div>
                <div className="mt-3 text-sm font-medium text-white">
                  Expires {formatExpiry(getOpsSessionExpiryDate(session))}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Shared-token access is active. Use this surface only for internal
                  operations and customer-sensitive actions.
                </div>
              </div>

              <OpsSidebarNav />

              <div className="space-y-3 border-t border-white/10 pt-5">
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  Customer Dashboard
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  Public Site
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <form action="/api/ops/session" method="post">
                  <input type="hidden" name="action" value="logout" />
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-between rounded-[1.4rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:border-red-400/35 hover:bg-red-500/15"
                  >
                    Log out
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
