import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  PackagePlus,
  RefreshCcw,
  SendToBack,
  ShieldCheck,
} from "lucide-react";
import { getTelegramBotInventoryOpsData } from "@/lib/telegram-bot-inventory-ops";
import {
  addTelegramBotPackItemAction,
  assignTelegramBotPackAction,
  createTelegramBotPackAction,
  importTelegramBotPackAction,
  retireTelegramBotPackAction,
  startTelegramBotPackTransferAction,
  updateTelegramBotTransferAction,
} from "@/app/ops/(protected)/telegram-inventory/actions";

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

function statusTone(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("revoked") ||
    normalized.includes("retired") ||
    normalized.includes("cancelled")
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("ready") ||
    normalized.includes("assigned") ||
    normalized.includes("completed") ||
    normalized.includes("transferred")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("draft") ||
    normalized.includes("scheduled") ||
    normalized.includes("progress") ||
    normalized.includes("stock")
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function describeNotice(notice: string | null): string | null {
  switch (notice) {
    case "pack-created":
      return "Draft pack created.";
    case "pack-imported":
      return "Bot pack imported successfully.";
    case "pack-imported-and-assigned":
      return "Bot pack imported and assigned to a workspace.";
    case "pack-item-added":
      return "Bot token added to the selected pack.";
    case "pack-assigned":
      return "Pack assigned to workspace.";
    case "pack-transfer-started":
      return "Transfer tracking started for this pack.";
    case "transfer-updated":
      return "Transfer status updated.";
    case "pack-retired":
      return "Pack retired.";
    default:
      return null;
  }
}

function describeError(error: string | null, fallbackMessage: string | null): string | null {
  switch (error) {
    case "import-payload-required":
      return "Paste a JSON payload before importing.";
    case "pack-item-required":
      return "Choose a pack and seat before adding a bot.";
    case "pack-assign-required":
      return "Choose both pack and workspace.";
    case "pack-transfer-required":
      return "Select a pack before starting transfer.";
    case "transfer-update-required":
      return "Transfer updates need a pack, status, and transfer target.";
    case "pack-retire-required":
      return "Select a pack before retiring it.";
    default:
      return fallbackMessage;
  }
}

function exampleImportJson() {
  return JSON.stringify(
    {
      template: "planck_hq_17",
      slug: "planck-pack-001",
      notes: "Warm inventory batch 1",
      bots: [
        {
          seatTemplateId: "seat.planck.hq.cro.george",
          displayName: "George Stock Bot",
          externalTelegramUsername: "planck_george_bot",
          botToken: "123456:ABCDEF",
          runtimeLabel: "warm-pack-001-george",
        },
      ],
    },
    null,
    2,
  );
}

export default async function TelegramInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getTelegramBotInventoryOpsData();
  const notice = describeNotice(readSearchParam(params, "notice"));
  const error = describeError(
    readSearchParam(params, "error"),
    readSearchParam(params, "message"),
  );
  const focusedPackId = readSearchParam(params, "packId");

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
              <Boxes className="h-3.5 w-3.5" />
              Planck HQ Bot Inventory
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Stage warm Telegram stock, assemble packs, and track handoff into workspaces.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                This is the Planck HQ stockyard for BotFather inventory. Import
                pre-created tokens, hold them as warm stock, assemble full seat packs,
                then bind and transfer them into customer or internal workspaces.
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
            <Boxes className="h-3.5 w-3.5" />
            Packs
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.packCount}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.readyPackCount} ready, {data.metrics.assignedPackCount} assigned
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Bot className="h-3.5 w-3.5" />
            Warm Stock
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.stockBots}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.totalBots} total imported bots
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Active Bindings
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.activeBots}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            Bots currently assigned into workspaces
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <SendToBack className="h-3.5 w-3.5" />
            Transfer Queue
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {data.metrics.transferPendingBots}
          </div>
          <div className="mt-2 text-sm text-slate-300">
            {data.metrics.transferredPackCount} fully transferred packs
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <PackagePlus className="h-4 w-4 text-cyan-300" />
              Create Draft Pack
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Start a blank `planck_hq_17` pack, then fill it manually or by bulk import.
            </p>
            <form action={createTelegramBotPackAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="slug">
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="planck-pack-001"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Warm batch 1, pre-created for Planck"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <PackagePlus className="h-4 w-4" />
                Create Draft Pack
              </button>
            </form>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              Manual Token Entry
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Add one bot at a time into an existing mutable pack.
            </p>
            <form action={addTelegramBotPackItemAction} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="packId">
                    Pack
                  </label>
                  <select
                    id="packId"
                    name="packId"
                    defaultValue={focusedPackId ?? ""}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="">Select pack</option>
                    {data.mutablePacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.slug} ({pack.items.length}/17, {pack.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-200"
                    htmlFor="seatTemplateId"
                  >
                    Seat
                  </label>
                  <select
                    id="seatTemplateId"
                    name="seatTemplateId"
                    defaultValue=""
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="">Select seat</option>
                    {data.seatTemplates.map((seat) => (
                      <option key={seat.id} value={seat.id}>
                        {seat.displayOrder}. {seat.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="genericLabel">
                    Generic Label
                  </label>
                  <input
                    id="genericLabel"
                    name="genericLabel"
                    type="text"
                    placeholder="George Stock Bot"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="displayName">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="George Stock Bot"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-200"
                    htmlFor="externalTelegramUsername"
                  >
                    Telegram Username
                  </label>
                  <input
                    id="externalTelegramUsername"
                    name="externalTelegramUsername"
                    type="text"
                    placeholder="@planck_george_bot"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="runtimeLabel">
                    Runtime Label
                  </label>
                  <input
                    id="runtimeLabel"
                    name="runtimeLabel"
                    type="text"
                    placeholder="warm-pack-001-george"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="botToken">
                  Bot Token
                </label>
                <input
                  id="botToken"
                  name="botToken"
                  type="password"
                  placeholder="123456:ABCDEF"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                <Bot className="h-4 w-4" />
                Add Bot Token
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <RefreshCcw className="h-4 w-4 text-cyan-300" />
            Bulk Import JSON
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Paste a full or partial import payload. If you also select a workspace, the
            imported pack will be assigned immediately after ingestion.
          </p>
          <form action={importTelegramBotPackAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="workspaceId">
                Assign to Workspace After Import
              </label>
              <select
                id="workspaceId"
                name="workspaceId"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              >
                <option value="">Do not assign yet</option>
                {data.workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.kind}) - {workspace._count.agents} agents
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="payload">
                Import Payload
              </label>
              <textarea
                id="payload"
                name="payload"
                rows={18}
                defaultValue={exampleImportJson()}
                className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 font-mono text-xs leading-6 text-cyan-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              <Boxes className="h-4 w-4" />
              Import Bot Pack
            </button>
          </form>
        </section>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Current Packs</h2>
            <p className="text-sm text-slate-300">
              Review completeness, assignment, transfer progress, and workspace mapping.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            {data.packs.length} pack{data.packs.length === 1 ? "" : "s"}
          </div>
        </div>

        {data.packs.length === 0 ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No packs yet. Create a draft pack or paste an import JSON payload above.
          </div>
        ) : null}

        {data.packs.map((pack) => (
          <section
            key={pack.id}
            className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{pack.slug}</h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${statusTone(pack.status)}`}
                  >
                    {pack.status}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {pack.items.length}/17 bots
                  </span>
                </div>
                <div className="flex flex-wrap gap-5 text-sm text-slate-300">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Pack ID
                    </div>
                    <div className="mt-1 font-medium text-white">{shortId(pack.id)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Workspace
                    </div>
                    <div className="mt-1 font-medium text-white">
                      {pack.workspace?.name ?? "Unassigned"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Updated
                    </div>
                    <div className="mt-1 font-medium text-white">
                      {formatDateTime(pack.updatedAt)}
                    </div>
                  </div>
                </div>
                {pack.notes ? (
                  <p className="max-w-3xl text-sm leading-6 text-slate-300">
                    {pack.notes}
                  </p>
                ) : null}
                {pack.missingSeatTemplates.length > 0 ? (
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Missing seats:{" "}
                    {pack.missingSeatTemplates
                      .map((template) => template.title)
                      .join(", ")}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <form action={assignTelegramBotPackAction} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <input type="hidden" name="packId" value={pack.id} />
                  <div className="text-sm font-medium text-white">Assign Pack</div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">
                    Bind this pack to a workspace and map bots onto Planck seat agents.
                  </div>
                  <select
                    name="workspaceId"
                    defaultValue={pack.workspaceId ?? ""}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="">Select workspace</option>
                    {data.workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!["ready", "assigned"].includes(pack.status)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BriefcaseBusiness className="h-4 w-4" />
                    Assign
                  </button>
                </form>

                <form action={startTelegramBotPackTransferAction} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <input type="hidden" name="packId" value={pack.id} />
                  <div className="text-sm font-medium text-white">Start Transfer</div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">
                    Create per-bot transfer records after assignment and begin handoff tracking.
                  </div>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Optional transfer note"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                  <button
                    type="submit"
                    disabled={!["assigned", "transfer_pending"].includes(pack.status)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SendToBack className="h-4 w-4" />
                    Start Transfer
                  </button>
                </form>

                <form action={retireTelegramBotPackAction} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <input type="hidden" name="packId" value={pack.id} />
                  <div className="text-sm font-medium text-white">Retire Pack</div>
                  <div className="mt-2 text-xs leading-5 text-slate-400">
                    Remove this pack from active inventory without deleting its audit trail.
                  </div>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Reason for retiring this pack"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                  />
                  <button
                    type="submit"
                    disabled={pack.status === "transferred"}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:border-red-400/30 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PackagePlus className="h-4 w-4" />
                    Retire
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">Seat Mapping</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Name only in Pixel HQ, title in metadata
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="pb-3 pr-4">Seat</th>
                        <th className="pb-3 pr-4">Username</th>
                        <th className="pb-3 pr-4">Identity</th>
                        <th className="pb-3 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {pack.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 align-top">
                            <div className="font-medium text-white">{item.genericLabel}</div>
                            <div className="text-xs text-slate-500">
                              {item.seatTemplateId}
                            </div>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {item.telegramIdentity.externalTelegramUsername ? (
                              <a
                                href={`https://t.me/${item.telegramIdentity.externalTelegramUsername}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                              >
                                @{item.telegramIdentity.externalTelegramUsername}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-slate-500">No username</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <div className="font-medium text-white">
                              {item.telegramIdentity.displayName ?? "Unnamed"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {shortId(item.telegramIdentityId)}
                            </div>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(item.assignmentStatus)}`}
                            >
                              {item.assignmentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <div className="text-sm font-medium text-white">Transfer Tracking</div>
                <div className="mt-2 text-sm text-slate-400">
                  Update individual bot transfer records when ownership handoff advances.
                </div>

                {pack.transfers.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    No transfer records yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pack.transfers.map((transfer) => (
                      <form
                        key={transfer.id}
                        action={updateTelegramBotTransferAction}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <input type="hidden" name="packId" value={pack.id} />
                        <input type="hidden" name="transferId" value={transfer.id} />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-white">
                              {transfer.telegramIdentity.displayName ??
                                transfer.packItem.genericLabel}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {transfer.packItem.seatTemplateId}
                            </div>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(transfer.transferStatus)}`}
                          >
                            {transfer.transferStatus}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[0.52fr_0.48fr]">
                          <select
                            name="transferStatus"
                            defaultValue={transfer.transferStatus}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                          >
                            <option value="not_started">Not started</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <input
                            name="notes"
                            type="text"
                            defaultValue={transfer.notes ?? ""}
                            placeholder="Optional note"
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                          />
                        </div>
                        <button
                          type="submit"
                          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Update Transfer
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
