import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  Bot,
  BriefcaseBusiness,
  Building2,
  Cable,
  CreditCard,
  PackagePlus,
  RadioTower,
  Rocket,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
import { getOpsPlatformData } from "@/lib/ops-platform";
import { resolveUserLaunchPricing } from "@/lib/user-launch-pricing";
import {
  confirmCustomerAgentWithoutPaymentAction,
  createCustomerAgentAction,
  createWorkspaceAction,
  provisionPlanckHqBotFleetAction,
  updateUserBillingAction,
} from "@/app/ops/(protected)/platform/actions";

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

function statusTone(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("retired") ||
    normalized.includes("revoked") ||
    normalized.includes("cancel")
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("ready") ||
    normalized.includes("assigned") ||
    normalized.includes("transferred")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("draft") ||
    normalized.includes("processing")
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function describeNotice(params: SearchParams): string | null {
  const notice = readSearchParam(params, "notice");

  switch (notice) {
    case "workspace-created":
      return `Workspace ${shortId(readSearchParam(params, "workspaceId"))} created.`;
    case "planck-fleet-provisioned":
      return `Planck HQ fleet provisioned. Created ${readSearchParam(params, "createdAgents") ?? "0"} agents, ${readSearchParam(params, "createdIdentities") ?? "0"} identities, updated ${readSearchParam(params, "updatedIdentities") ?? "0"} identities.`;
    case "billing-updated":
      return `Billing controls updated for user ${shortId(readSearchParam(params, "userId"))}.`;
    case "customer-agent-created":
      return `Customer agent ${shortId(readSearchParam(params, "agentId"))} created and left pending checkout.`;
    case "customer-agent-activated":
      return `Customer agent ${shortId(readSearchParam(params, "agentId"))} created and activated without external checkout.`;
    case "manual-activation-complete":
      return `Agent ${shortId(readSearchParam(params, "agentId"))} activated without external checkout.`;
    default:
      return null;
  }
}

function describeError(params: SearchParams): string | null {
  const error = readSearchParam(params, "error");
  const message = readSearchParam(params, "message");

  switch (error) {
    case "workspace-name-required":
      return "Workspace name is required.";
    case "planck-user-required":
      return "A userId is required to provision the Planck HQ fleet.";
    case "billing-user-required":
      return "A userId is required to update billing controls.";
    case "customer-agent-required":
      return "User ID, agent name, personality, and bot token are required to create a customer agent.";
    case "manual-activation-agent-required":
      return "An agentId is required for internal activation.";
    default:
      return message;
  }
}

function describeLaunchPricing(user: {
  monthlyLaunchFeeUsd: number | null;
  dayPassLaunchFeeUsd: number | null;
  monthlyLaunchFeeWaived: boolean;
  dayPassLaunchFeeWaived: boolean;
}) {
  const pricing = resolveUserLaunchPricing(user);
  return {
    monthly:
      pricing.monthlySource === "waived"
        ? "Monthly waived"
        : `${pricing.monthlyPriceUsd.toFixed(pricing.monthlyPriceUsd % 1 === 0 ? 0 : 2)} USD monthly`,
    dayPass:
      pricing.dayPassSource === "waived"
        ? "Day pass waived"
        : `${pricing.dayPassPriceUsd.toFixed(pricing.dayPassPriceUsd % 1 === 0 ? 0 : 2)} USD day pass`,
  };
}

export default async function OpsPlatformPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getOpsPlatformData();
  const notice = describeNotice(resolvedSearchParams);
  const error = describeError(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(10,22,38,0.96),rgba(7,18,32,0.92))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              href="/ops"
              className="inline-flex items-center gap-2 text-sm text-amber-200 transition hover:text-amber-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Planck HQ
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-100">
              <Building2 className="h-3.5 w-3.5" />
              Planck HQ Launch Studio
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Launch customers, shape fees, and provision the Planck workspace fabric.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                This is the commercial and provisioning desk inside Planck HQ. Use it
                to create workspaces, provision internal fleet structure, set
                per-customer billing exceptions, and launch or activate customer agents
                without leaving the admin surface.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Generated
            </div>
            <div className="mt-1 font-medium text-white">
              {formatDateTime(data.generatedAt)}
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            Workspaces
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.workspaceCount}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.companyWorkspaceCount} company, {data.metrics.personalWorkspaceCount} personal
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Workflow className="h-3.5 w-3.5" />
            Fleets
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.fleetCount}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.activeFleetCount} active
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Bot className="h-3.5 w-3.5" />
            Planck Seats
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.planckAgentCount}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.planckSeatCount} seat templates available
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Blocks className="h-3.5 w-3.5" />
            Registry
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.useCaseTemplateCount}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.catalogItemCount} catalog items, {data.metrics.skillDefinitionCount} skills
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <PackagePlus className="h-4 w-4 text-cyan-300" />
            Create Workspace
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Create a new company or personal workspace and optionally attach an owner
            and initial members.
          </p>
          <form action={createWorkspaceAction} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Planck HQ"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="slug">
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="planck-hq"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="kind">
                  Kind
                </label>
                <select
                  id="kind"
                  name="kind"
                  defaultValue="company"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="company">Company</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="ownerUserId">
                  Owner User ID
                </label>
                <input
                  id="ownerUserId"
                  name="ownerUserId"
                  type="text"
                  list="recent-users"
                  placeholder="Optional owner userId"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="memberUserIds">
                Member User IDs
              </label>
              <textarea
                id="memberUserIds"
                name="memberUserIds"
                rows={3}
                placeholder="Optional extra member userIds, comma or newline separated"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Building2 className="h-4 w-4" />
              Create Workspace
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Bot className="h-4 w-4 text-cyan-300" />
            Provision Planck HQ Fleet
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Create or repair the 17 Planck HQ seat agents and Telegram identities inside
            an existing workspace. Use this after creating the workspace and before
            assigning warm inventory.
          </p>
          <form action={provisionPlanckHqBotFleetAction} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="userId">
                  User ID
                </label>
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  list="recent-users"
                  placeholder="Owner userId"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="workspaceId">
                  Workspace
                </label>
                <select
                  id="workspaceId"
                  name="workspaceId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="">Select workspace</option>
                  {data.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} ({workspace.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="identityStatus">
                  Identity Status
                </label>
                <select
                  id="identityStatus"
                  name="identityStatus"
                  defaultValue="pending"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="ownershipType">
                  Ownership Type
                </label>
                <select
                  id="ownershipType"
                  name="ownershipType"
                  defaultValue="meetmatt_managed"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="meetmatt_managed">MeetMatt managed</option>
                  <option value="customer_owned">Customer owned</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              <RadioTower className="h-4 w-4" />
              Provision Planck HQ
            </button>
          </form>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
            Warm inventory assignment is handled separately in{" "}
            <Link href="/ops/telegram-inventory" className="text-cyan-300 hover:text-cyan-200">
              Telegram Inventory
            </Link>
            .
          </div>
        </section>
      </section>

      <datalist id="recent-users">
        {data.recentUsers.map((user) => (
          <option
            key={user.id}
            value={user.id}
            label={`${user.name?.trim() || user.email?.trim() || user.id}`}
          />
        ))}
      </datalist>

      <datalist id="recent-customer-agents">
        {data.recentCustomerAgents.map((agent) => (
          <option
            key={agent.id}
            value={agent.id}
            label={`${agent.name} · ${describeUser(agent.user)} · ${agent.status}`}
          />
        ))}
      </datalist>

      <section className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <CreditCard className="h-4 w-4 text-cyan-300" />
            User Billing Controls
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Override or waive monthly and day-pass launch fees per user. A zero or waived
            fee will skip external checkout and confirm internally.
          </p>
          <form action={updateUserBillingAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="billingUserId">
                User ID
              </label>
              <input
                id="billingUserId"
                name="userId"
                type="text"
                list="recent-users"
                placeholder="Select userId"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="monthlyLaunchFeeUsd">
                  Monthly Fee (USD)
                </label>
                <input
                  id="monthlyLaunchFeeUsd"
                  name="monthlyLaunchFeeUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="dayPassLaunchFeeUsd">
                  Day Pass Fee (USD)
                </label>
                <input
                  id="dayPassLaunchFeeUsd"
                  name="dayPassLaunchFeeUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                <input type="checkbox" name="monthlyLaunchFeeWaived" className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent" />
                <span>Waive monthly launch fee</span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
                <input type="checkbox" name="dayPassLaunchFeeWaived" className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent" />
                <span>Waive day-pass fee</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="billingNotes">
                Billing Notes
              </label>
              <textarea
                id="billingNotes"
                name="billingNotes"
                rows={3}
                placeholder="Internal note shown when special pricing is applied"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Settings2 className="h-4 w-4" />
              Save Billing Controls
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Rocket className="h-4 w-4 text-cyan-300" />
            Create Customer Agent
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            No-code create a customer agent from ops. You can leave it pending checkout or
            activate it immediately without Dodo.
          </p>
          <form action={createCustomerAgentAction} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerUserId">
                  User ID
                </label>
                <input
                  id="customerUserId"
                  name="userId"
                  type="text"
                  list="recent-users"
                  placeholder="Customer userId"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerWorkspaceId">
                  Workspace
                </label>
                <select
                  id="customerWorkspaceId"
                  name="workspaceId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="">Use personal workspace</option>
                  {data.workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} ({workspace.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerAgentName">
                  Agent Name
                </label>
                <input
                  id="customerAgentName"
                  name="agentName"
                  type="text"
                  placeholder="Ada"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerUseCase">
                  Use Case
                </label>
                <select
                  id="customerUseCase"
                  name="useCase"
                  defaultValue="assistant"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="assistant">Assistant</option>
                  <option value="fleet">Fleet</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="customerPersonality">
                Personality / Scope
              </label>
              <textarea
                id="customerPersonality"
                name="personality"
                rows={3}
                placeholder="Professional, direct, responsive, and suited for Telegram customer conversations."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerUseCaseSlug">
                  Use Case Template Slug
                </label>
                <input
                  id="customerUseCaseSlug"
                  name="useCaseSlug"
                  type="text"
                  placeholder="Optional override"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="customerLaunchPlan">
                  Internal Launch Plan
                </label>
                <select
                  id="customerLaunchPlan"
                  name="launchPlan"
                  defaultValue="monthly"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                >
                  <option value="monthly">Monthly</option>
                  <option value="day_pass">Day pass</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="customerTelegramBotToken">
                Bot Token
              </label>
              <input
                id="customerTelegramBotToken"
                name="telegramBotToken"
                type="password"
                autoComplete="off"
                placeholder="1234567890:AAExampleBotFatherToken"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
              <input type="checkbox" name="activateWithoutPayment" className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent" />
              <span>Activate immediately without external checkout using the user&apos;s effective pricing / waiver settings.</span>
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Rocket className="h-4 w-4" />
              Create Customer Agent
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Bot className="h-4 w-4 text-cyan-300" />
            Activate Existing Agent
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use this when a pending customer agent already exists and you want to move it
            into deployment without running Dodo.
          </p>
          <form action={confirmCustomerAgentWithoutPaymentAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="manualAgentId">
                Agent ID
              </label>
              <input
                id="manualAgentId"
                name="agentId"
                type="text"
                list="recent-customer-agents"
                placeholder="Pending customer agent"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="manualLaunchPlan">
                Launch Plan
              </label>
              <select
                id="manualLaunchPlan"
                name="launchPlan"
                defaultValue="monthly"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              >
                <option value="monthly">Monthly</option>
                <option value="day_pass">Day pass</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              <Bot className="h-4 w-4" />
              Activate Without Checkout
            </button>
          </form>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <BriefcaseBusiness className="h-4 w-4 text-cyan-300" />
            Workspaces
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Current workspace inventory with operational counts for agents, fleets,
            identities, and bot packs.
          </p>
          <div className="mt-5 space-y-3">
            {data.workspaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                No workspaces found.
              </div>
            ) : (
              data.workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {workspace.name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(workspace.kind)}`}
                        >
                          {workspace.kind}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Owner {describeUser(workspace.ownerUser)}
                      </div>
                      <div className="text-sm text-slate-400">
                        {workspace._count.agents} agents • {workspace._count.fleets} fleets •{" "}
                        {workspace._count.telegramIdentities} telegram identities •{" "}
                        {workspace._count.telegramBotPacks} bot packs
                      </div>
                      <div className="text-sm text-slate-400">
                        {workspace._count.customerRelationships} relationships •{" "}
                        {workspace._count.supportTickets} tickets •{" "}
                        {workspace._count.payments} payments
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{workspace.slug}</div>
                      <div className="mt-1">{formatDateTime(workspace.updatedAt)}</div>
                      <div className="mt-1">ID {shortId(workspace.id)}</div>
                    </div>
                  </div>
                  {workspace.memberships.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {workspace.memberships.map((membership) => (
                        <span
                          key={membership.id}
                          className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200"
                        >
                          {describeUser(membership.user)} • {membership.role}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Users className="h-4 w-4 text-cyan-300" />
            Recent Users
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Useful source IDs for workspace ownership and Planck provisioning.
          </p>
          <div className="mt-5 space-y-3">
            {data.recentUsers.map((user) => (
              (() => {
                const pricing = describeLaunchPricing(user);
                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {describeUser(user)}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {user.email ?? "No email"}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {user.id}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-400">
                        <div>{formatDateTime(user.createdAt)}</div>
                        <div className="mt-1">
                          {user._count.agents} agents • {user._count.workspaceMemberships} workspaces
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-200">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {pricing.monthly}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {pricing.dayPass}
                      </span>
                    </div>
                    {user.billingNotes ? (
                      <div className="mt-3 text-sm leading-6 text-slate-400">
                        {user.billingNotes}
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Bot className="h-4 w-4 text-cyan-300" />
          Recent Customer Agents
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Operational view of customer-owned agents that can be manually activated from ops.
        </p>
        <div className="mt-5 space-y-3">
          {data.recentCustomerAgents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
              No customer agents found.
            </div>
          ) : (
            data.recentCustomerAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-white">
                        {agent.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(agent.status)}`}
                      >
                        {agent.status}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(agent.activationStatus)}`}
                      >
                        {agent.activationStatus}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300">
                      {describeUser(agent.user)} • {agent.workspace?.name ?? "Personal workspace"}
                    </div>
                    <div className="text-sm text-slate-400">
                      Deploy {agent.deployState} • Subscription {agent.subscriptionStatus}/{agent.subscriptionType}
                      {agent.botUsername ? ` • @${agent.botUsername}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <div>{formatDateTime(agent.updatedAt)}</div>
                    <div className="mt-1">ID {shortId(agent.id)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Workflow className="h-4 w-4 text-cyan-300" />
            Fleets
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Fleet orchestration is already part of Matt’s backend. This gives the admin
            panel a direct view into the active fleet topology.
          </p>
          <div className="mt-5 space-y-3">
            {data.fleets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                No fleets found.
              </div>
            ) : (
              data.fleets.map((fleet) => (
                <div
                  key={fleet.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {fleet.name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(fleet.status)}`}
                        >
                          {fleet.status}
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                          {fleet.type}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Workspace {fleet.workspace?.name ?? "Matt internal"} • owner {fleet.ownerType}
                      </div>
                      <div className="text-sm text-slate-400">
                        {fleet._count.memberships} members • {fleet._count.tasks} tasks • {fleet._count.runs} runs
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{fleet.slug}</div>
                      <div className="mt-1">{formatDateTime(fleet.updatedAt)}</div>
                    </div>
                  </div>
                  {fleet.memberships.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fleet.memberships.map((membership) => (
                        <span
                          key={membership.id}
                          className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
                        >
                          {membership.agent.name} • {membership.role}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Cable className="h-4 w-4 text-cyan-300" />
            Capability Registry
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Read-only view of the use-case template layer that powers current Matt agent
            provisioning and loadout resolution.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Use case templates
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.useCaseTemplateCount}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {data.metrics.activeUseCaseTemplateCount} active
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Entitlement packs
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.entitlementPackCount}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Capability-commerce grant layer
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Catalog items
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.catalogItemCount}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {data.metrics.activeCatalogItemCount} active
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Warm bot packs
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.telegramBotPackCount}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {data.metrics.readyTelegramBotPackCount} ready for assignment
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.useCaseTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-white">
                        {template.name}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(template.status)}`}
                      >
                        {template.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      {template.slug} • {template.agentKind} • {template.category}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {template._count.items} items • {template._count.entitlements} entitlements •{" "}
                      {template._count.agents} agents
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <div>{formatDateTime(template.updatedAt)}</div>
                  </div>
                </div>
                {template.description ? (
                  <div className="mt-3 text-sm leading-6 text-slate-400">
                    {template.description}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
