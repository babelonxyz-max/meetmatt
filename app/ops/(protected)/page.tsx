import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CreditCard,
  Layers3,
  MessageSquareWarning,
  Radar,
  RadioTower,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { getOpsDashboardData } from "@/lib/ops-dashboard";
import { getOpsPlatformData } from "@/lib/ops-platform";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "No recent activity";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return "Just now";
  }

  if (absMinutes < 60) {
    return diffMinutes >= 0 ? `${absMinutes}m ago` : `in ${absMinutes}m`;
  }

  const diffHours = Math.round(absMinutes / 60);
  if (diffHours < 24) {
    return diffMinutes >= 0 ? `${diffHours}h ago` : `in ${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return diffMinutes >= 0 ? `${diffDays}d ago` : `in ${diffDays}d`;
}

function shortId(value: string | null | undefined): string {
  if (!value) {
    return "n/a";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function describeUser(user: {
  id: string;
  name: string | null;
  email: string | null;
} | null | undefined): string {
  if (!user) {
    return "Unknown user";
  }

  return user.name?.trim() || user.email?.trim() || shortId(user.id);
}

function toneForStatus(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("revoked") ||
    normalized.includes("canceled")
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-100";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("ready") ||
    normalized.includes("confirmed") ||
    normalized.includes("completed")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("queued") ||
    normalized.includes("processing") ||
    normalized.includes("partially") ||
    normalized.includes("draft")
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/[0.05] text-slate-200";
}

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: number;
  detail: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="text-4xl font-semibold tracking-tight text-white">{value}</div>
        <div
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${accent}`}
        >
          Live
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

function ModuleCard({
  href,
  eyebrow,
  title,
  description,
  detail,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const Icon = icon;

  return (
    <Link
      href={href}
      className="group rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.18)] transition hover:border-amber-300/25 hover:bg-[linear-gradient(180deg,rgba(255,235,205,0.08),rgba(255,255,255,0.03))]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-slate-300">
        <span>{detail}</span>
        <span className="inline-flex items-center gap-2 font-medium text-amber-100">
          Open
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default async function OpsPlanckHqPage() {
  const [dashboard, platform] = await Promise.all([
    getOpsDashboardData(),
    getOpsPlatformData(),
  ]);

  const failedEnvChecks = dashboard.envChecks.filter((check) => !check.ready);
  const pendingCustomerAgents = platform.recentCustomerAgents.filter(
    (agent) =>
      agent.deployState !== "active" ||
      agent.activationStatus !== "active" ||
      agent.subscriptionStatus === "pending",
  );

  const attentionItems = [
    dashboard.metrics.pendingPayments > 0
      ? {
          icon: CreditCard,
          title: `${dashboard.metrics.pendingPayments} payments still pending`,
          detail: "Checkout has started but confirmation has not fully landed.",
        }
      : null,
    dashboard.metrics.activeDeployJobs > 0
      ? {
          icon: Workflow,
          title: `${dashboard.metrics.activeDeployJobs} deploy jobs in flight`,
          detail: "Activation still depends on jobs clearing from the queue.",
        }
      : null,
    dashboard.metrics.openTickets > 0
      ? {
          icon: MessageSquareWarning,
          title: `${dashboard.metrics.openTickets} support tickets remain open`,
          detail: "Customer threads still need visible ownership.",
        }
      : null,
    dashboard.metrics.pendingOutbound > 0
      ? {
          icon: RadioTower,
          title: `${dashboard.metrics.pendingOutbound} outbound messages waiting`,
          detail: "Telethon delivery or acknowledgement is still behind.",
        }
      : null,
    failedEnvChecks.length > 0
      ? {
          icon: ShieldAlert,
          title: `${failedEnvChecks.length} environment checks are not ready`,
          detail: "Planck HQ still has missing secrets or disabled integrations.",
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: ComponentType<{ className?: string }>;
    title: string;
    detail: string;
  }>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(140deg,rgba(20,18,29,0.98),rgba(11,18,30,0.96),rgba(35,22,14,0.92))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-100">
              <Layers3 className="h-3.5 w-3.5" />
              Planck HQ
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Run launches, runtime pressure, and operator inventory from one deck.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Planck HQ is now the backoffice front door. Keep launch pricing,
                manual activations, payment pressure, support load, and Telegram stock
                in view without dropping straight into the old maintenance console.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Customer launches
                </div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {platform.recentCustomerAgents.length}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {pendingCustomerAgents.length} still need deploy, payment, or activation closure.
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Workspace fabric
                </div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {platform.metrics.workspaceCount}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {platform.metrics.fleetCount} fleets and {platform.metrics.planckAgentCount} Planck seat agents.
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Warm stock
                </div>
                <div className="mt-3 text-2xl font-semibold text-white">
                  {platform.metrics.readyTelegramBotPackCount}
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  ready packs available across {platform.metrics.telegramBotPackCount} imported packs.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              Attention board
            </div>
            <div className="mt-4 space-y-3">
              {attentionItems.length === 0 ? (
                <div className="rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                  No major launch or runtime pressure is visible right now.
                </div>
              ) : (
                attentionItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-2.5 text-amber-100">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{item.title}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-300">
                            {item.detail}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Generated
              </div>
              <div className="mt-2 font-medium text-white">
                {formatDateTime(dashboard.generatedAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue Pressure"
          value={dashboard.metrics.pendingPayments}
          detail="Payments that still have to settle before the customer path is truly closed."
          accent="border-amber-500/20 bg-amber-500/10 text-amber-100"
        />
        <MetricCard
          label="Deploy Queue"
          value={dashboard.metrics.activeDeployJobs}
          detail="Queued or processing deploy jobs still shaping activation state."
          accent="border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
        />
        <MetricCard
          label="Support Load"
          value={dashboard.metrics.openTickets}
          detail="Open, pending-user, or escalated support work still visible to customers."
          accent="border-rose-500/20 bg-rose-500/10 text-rose-100"
        />
        <MetricCard
          label="Outbound Pressure"
          value={dashboard.metrics.pendingOutbound}
          detail="Messages waiting on runner delivery, claim, or acknowledgement."
          accent="border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ModuleCard
          href="/ops/platform"
          eyebrow="Commercial desk"
          title="Launch Studio"
          description="Adjust per-user fees, waive launches, create customer agents, and activate them without external checkout when you need internal handling."
          detail={`${platform.recentUsers.length} recent users with launch pricing visibility`}
          icon={Building2}
        />
        <ModuleCard
          href="/ops/telegram-inventory"
          eyebrow="Stockyard"
          title="Bot Inventory"
          description="Import warm BotFather stock, assemble seat packs, assign them to workspaces, and track transfer state after provisioning."
          detail={`${platform.metrics.readyTelegramBotPackCount} ready packs and ${platform.metrics.planckSeatCount} seat templates`}
          icon={Boxes}
        />
        <ModuleCard
          href="/ops/control-room"
          eyebrow="Engineer surface"
          title="Control Room"
          description="Open the deep console for Telethon, support tickets, deploy jobs, thread bindings, and queue repair when the HQ summary is not enough."
          detail={`${dashboard.metrics.telethonIdentityCount} Telethon identities and ${dashboard.metrics.activeTasks} active tasks`}
          icon={Radar}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Readiness gaps
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Environment and integration issues
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Missing secrets and disabled subsystems still break launches even when the
            customer UI looks healthy.
          </p>

          <div className="mt-5 space-y-3">
            {failedEnvChecks.length === 0 ? (
              <div className="rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                All tracked environment checks are ready.
              </div>
            ) : (
              failedEnvChecks.slice(0, 6).map((check) => (
                <div
                  key={check.key}
                  className="rounded-[1.4rem] border border-red-500/20 bg-red-500/10 px-4 py-4"
                >
                  <div className="text-sm font-medium text-white">{check.label}</div>
                  <div className="mt-1 text-sm leading-6 text-red-100/90">
                    {check.description}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <Workflow className="h-3.5 w-3.5" />
            Customer launches
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Recent customer agents
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            This is the clearest view of what still needs action across launch,
            payment, deploy, and activation.
          </p>

          <div className="mt-5 space-y-3">
            {platform.recentCustomerAgents.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                No customer agents have been created yet.
              </div>
            ) : (
              platform.recentCustomerAgents.slice(0, 8).map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/15 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{agent.name}</div>
                      <div className="mt-1 text-sm text-slate-300">
                        {describeUser(agent.user)} • {agent.botUsername || "No bot username yet"}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        Updated {formatRelativeTime(agent.updatedAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em]">
                      <span className={`rounded-full border px-3 py-1 ${toneForStatus(agent.deployState)}`}>
                        Deploy {agent.deployState}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 ${toneForStatus(agent.activationStatus)}`}
                      >
                        Activation {agent.activationStatus}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 ${toneForStatus(agent.subscriptionStatus)}`}
                      >
                        {agent.subscriptionType} / {agent.subscriptionStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <CreditCard className="h-3.5 w-3.5" />
            Payments
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Recent payment sessions
          </h2>
          <div className="mt-5 space-y-3">
            {dashboard.recentPayments.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                No recent payments recorded.
              </div>
            ) : (
              dashboard.recentPayments.slice(0, 6).map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[1.45rem] border border-white/10 bg-black/15 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {formatMoney(payment.amount, payment.currency)}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        {payment.provider} • {payment.paymentMethodType || "unknown method"} •{" "}
                        {payment.paymentPurpose}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {payment.targetType} {shortId(payment.targetId)}
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${toneForStatus(payment.status)}`}>
                        {payment.status}
                      </span>
                      <div className="text-xs text-slate-500">
                        {formatRelativeTime(payment.confirmedAt ?? payment.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <MessageSquareWarning className="h-3.5 w-3.5" />
            Support queue
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Open customer tickets
          </h2>
          <div className="mt-5 space-y-3">
            {dashboard.tickets.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                No open or escalated tickets right now.
              </div>
            ) : (
              dashboard.tickets.slice(0, 6).map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-[1.45rem] border border-white/10 bg-black/15 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {ticket.subject || `Ticket ${shortId(ticket.id)}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        {describeUser(ticket.requester)}
                        {ticket.assignedAgent ? ` • ${ticket.assignedAgent.name}` : ""}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        Updated {formatRelativeTime(ticket.updatedAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em]">
                      <span className={`rounded-full border px-3 py-1 ${toneForStatus(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`rounded-full border px-3 py-1 ${toneForStatus(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
