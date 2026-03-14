import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bot,
  Boxes,
  Building2,
  Cable,
  CheckCircle2,
  CreditCard,
  Layers3,
  MessageSquare,
  RadioTower,
  ShieldAlert,
  Ticket,
  UserRound,
  Workflow,
} from "lucide-react";
import { getOpsDashboardData } from "@/lib/ops-dashboard";
import {
  acknowledgeOutboundTransportMessageAction,
  claimTelethonOutboundAction,
  dispatchFleetTaskAction,
  processDeployJobsAction,
  provisionTelethonIdentityAction,
  queueInboundRelationshipTaskAction,
  replayOutboundTransportMessageAction,
  sendTelethonHeartbeatAction,
  seedMattRelationshipPackAction,
  smokeTestMattConnectorActionAction,
  smokeTestWhatsAppAction,
  upsertTelegramThreadBindingAction,
  updateSupportTicketAction,
  validateWorkspaceComposioAction,
} from "@/app/ops/(protected)/actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const TASK_UPDATE_STATUS_OPTIONS = [
  { value: "", label: "No status change" },
  { value: "running", label: "Running" },
  { value: "needs_approval", label: "Needs approval" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
] as const;

const TASK_UPDATE_TICKET_STATUS_OPTIONS = [
  { value: "", label: "Auto / no change" },
  { value: "open", label: "Open" },
  { value: "pending_user", label: "Pending user" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const SUPPORT_TICKET_STATUS_CONTROL_OPTIONS = [
  { value: "", label: "No status change" },
  { value: "open", label: "Open" },
  { value: "pending_user", label: "Pending user" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const SUPPORT_TICKET_PRIORITY_CONTROL_OPTIONS = [
  { value: "", label: "No priority change" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const THREAD_BINDING_TYPE_OPTIONS = [
  { value: "matt_relationship", label: "Matt relationship" },
  { value: "customer_support", label: "Customer support" },
  { value: "customer_employee", label: "Customer employee" },
  { value: "internal_ops", label: "Internal ops" },
] as const;

const OUTBOUND_ACK_STATUS_OPTIONS = [
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
] as const;

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
    return "No activity";
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

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function describeUser(user: {
  name: string | null;
  email: string | null;
  id: string;
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
    normalized.includes("revoked") ||
    normalized.includes("expired") ||
    normalized.includes("canceled")
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("confirmed") ||
    normalized.includes("completed") ||
    normalized.includes("resolved") ||
    normalized.includes("sent")
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (
    normalized.includes("queued") ||
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("processing") ||
    normalized.includes("claimed") ||
    normalized.includes("needs_approval") ||
    normalized.includes("partially") ||
    normalized.includes("open") ||
    normalized.includes("escalated")
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function priorityTone(priority: string | null | undefined): string {
  if (priority === "urgent") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (priority === "high") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (priority === "low") {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-200";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function integrationStatusTone(status: string | null | undefined): string {
  if (status === "ready") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "degraded") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function readJsonTextField(value: unknown, field: string): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const raw = (value as Record<string, unknown>)[field];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function describeTaskPayload(value: unknown): string {
  return (
    readJsonTextField(value, "message") ||
    readJsonTextField(value, "summary") ||
    readJsonTextField(value, "title") ||
    "No task payload preview"
  );
}

function describeOutboundPayload(value: unknown): string {
  return (
    readJsonTextField(value, "text") ||
    readJsonTextField(value, "message") ||
    readJsonTextField(value, "body") ||
    "No outbound payload preview"
  );
}

function trimCopy(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

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

function renderNoticeBanner(params: SearchParams) {
  const notice = readSearchParam(params, "notice");
  const error = readSearchParam(params, "error");

  if (notice === "relationship-seeded") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Matt relationship pack seeded for user{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "userId") ?? "unknown"}
        </span>
        .
      </section>
    );
  }

  if (notice === "deploy-processed") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Deploy queue processed. Completed {readSearchParam(params, "completed") ?? "0"},
        retried {readSearchParam(params, "retried") ?? "0"}, failed{" "}
        {readSearchParam(params, "failed") ?? "0"}.
      </section>
    );
  }

  if (notice === "outbound-replayed") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Outbound transport message{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "messageId"))}
        </span>{" "}
        has been re-queued for immediate retry.
      </section>
    );
  }

  if (notice === "thread-bound") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Matt thread bound for user{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "userId") ?? "unknown"}
        </span>{" "}
        on Telegram chat{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "externalThreadId") ?? "unknown"}
        </span>
        .
      </section>
    );
  }

  if (notice === "identity-provisioned") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Telethon identity{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "identityId"))}
        </span>{" "}
        has been provisioned.
      </section>
    );
  }

  if (notice === "task-updated") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Fleet task{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "taskId"))}
        </span>
        updated to{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "status") ?? "unchanged"}
        </span>
        {readSearchParam(params, "messageId") ? " and outbound transport was queued." : "."}
      </section>
    );
  }

  if (notice === "ticket-updated") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Support ticket{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "ticketId"))}
        </span>{" "}
        updated to{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "status") ?? "unchanged"}
        </span>
        .
      </section>
    );
  }

  if (notice === "heartbeat-sent") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Telethon heartbeat recorded for identity{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "identityId"))}
        </span>{" "}
        as{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "connected") === "false" ? "disconnected" : "connected"}
        </span>
        .
      </section>
    );
  }

  if (notice === "outbound-claimed") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Runner poll claimed{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "count") ?? "0"}
        </span>{" "}
        outbound messages.
      </section>
    );
  }

  if (notice === "binding-upserted") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Telegram thread binding{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "bindingId"))}
        </span>{" "}
        has been saved.
      </section>
    );
  }

  if (notice === "outbound-acked") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Outbound transport message{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "messageId"))}
        </span>{" "}
        acknowledged as{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "status") ?? "updated"}
        </span>
        .
      </section>
    );
  }

  if (notice === "composio-validated") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Composio readiness validated for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>
        .
      </section>
    );
  }

  if (notice === "connector-smoke-tested") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Connector smoke test finished for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>{" "}
        via{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "provider") ?? "unknown"}
        </span>
        .
      </section>
    );
  }

  if (notice === "whatsapp-smoke-tested") {
    return (
      <section className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        WhatsApp outbound smoke test sent for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>
        .
      </section>
    );
  }

  if (error === "seed-user-id") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        A `userId` is required to seed a Matt relationship pack.
      </section>
    );
  }

  if (error === "seed-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to seed the Matt relationship pack for user{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "userId") ?? "unknown"}
        </span>
        .
      </section>
    );
  }

  if (error === "deploy-process-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to process the deploy queue.
      </section>
    );
  }

  if (error === "outbound-message-id") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        An outbound `messageId` is required to replay transport work.
      </section>
    );
  }

  if (error === "outbound-replay-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to replay outbound transport message{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "messageId"))}
        </span>
        .
      </section>
    );
  }

  if (error === "thread-bind-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        `userId`, `telegramIdentityId`, `externalThreadId`, and a message are
        required to create a Matt Telegram thread.
      </section>
    );
  }

  if (error === "thread-bind-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to create a Matt Telegram thread for user{" "}
        <span className="font-medium text-white">
          {readSearchParam(params, "userId") ?? "unknown"}
        </span>
        .
      </section>
    );
  }

  if (error === "identity-label-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Add at least a display name, username, phone, or Telegram user id before
        provisioning an identity.
      </section>
    );
  }

  if (error === "identity-bot-token") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Bot identities require a Telegram bot token.
      </section>
    );
  }

  if (error === "identity-active-credentials") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Active identities need runtime credentials: a session for `user_agent` or a
        bot token for `bot`.
      </section>
    );
  }

  if (error === "identity-provision-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to provision the Telethon identity.
      </section>
    );
  }

  if (error === "task-id-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        A `taskId` is required to update fleet task state.
      </section>
    );
  }

  if (error === "task-update-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to update fleet task{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "taskId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "ticket-id-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        A `ticketId` is required to update support ticket state.
      </section>
    );
  }

  if (error === "ticket-update-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to update support ticket{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "ticketId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "heartbeat-identity-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Select a Telethon identity before sending a runner heartbeat.
      </section>
    );
  }

  if (error === "heartbeat-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to send the Telethon heartbeat. {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "outbound-claim-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to claim outbound runner work. {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "binding-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        `telegramIdentityId` and `externalChatId` are required to create a thread
        binding.
      </section>
    );
  }

  if (error === "binding-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to save the Telegram thread binding. {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "outbound-ack-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        `messageId` and ack status are required to acknowledge outbound transport.
      </section>
    );
  }

  if (error === "outbound-ack-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to acknowledge outbound message{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "messageId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "composio-validate-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        A `workspaceId` is required before validating Composio readiness.
      </section>
    );
  }

  if (error === "composio-validate-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Failed to validate Composio for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "connector-smoke-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        `workspaceId` and `composioToolSlug` are required for a connector smoke test.
      </section>
    );
  }

  if (error === "connector-smoke-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        Connector smoke test failed for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  if (error === "whatsapp-smoke-required") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        `workspaceId`, recipient phone, and message text are required for a WhatsApp smoke test.
      </section>
    );
  }

  if (error === "whatsapp-smoke-failed") {
    return (
      <section className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
        WhatsApp smoke test failed for workspace{" "}
        <span className="font-medium text-white">
          {shortId(readSearchParam(params, "workspaceId"))}
        </span>
        . {readSearchParam(params, "message") ?? ""}
      </section>
    );
  }

  return null;
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
          <div className="mt-2 text-sm text-slate-400">{detail}</div>
        </div>
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-cyan-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[1.75rem] border border-white/10 bg-[var(--card)]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl"
    >
      <div className="mb-5 space-y-2">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </div>
        <div className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </div>
        <div className="max-w-3xl text-sm leading-6 text-slate-400">
          {description}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
      {message}
    </div>
  );
}

export default async function OpsDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getOpsDashboardData();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(140deg,rgba(18,18,28,0.98),rgba(9,16,28,0.96),rgba(34,22,15,0.92))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-100">
            <Workflow className="h-3.5 w-3.5" />
            Planck HQ Control Room
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Deep runtime, support, and queue controls live here.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Use this route when the HQ overview is not enough. It keeps the full
              single-page maintenance console for Telethon, support recovery, deploy
              processing, queue repair, and thread binding work.
            </p>
          </div>
        </div>
      </section>

      {renderNoticeBanner(resolvedSearchParams)}

      <SectionCard
        eyebrow="Control Map"
        title="Operate the system by domain"
        description="The old single-page console is preserved here as the engineer-grade recovery surface. Use it when you need direct control over money path, relationships, Telegram transport, capability loadouts, platform setup, and warm bot inventory."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <a
            href="#money-path"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <CreditCard className="h-3.5 w-3.5" />
              Money Path
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Payments and deploy queue
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Track the activation path from payment to deploy job completion.
            </div>
          </a>

          <a
            href="#relationships"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <UserRound className="h-3.5 w-3.5" />
              Relationships
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Customers, tickets, tasks, and threads
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Run Matt support/account management and the queue behind it.
            </div>
          </a>

          <a
            href="#integrations"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Cable className="h-3.5 w-3.5" />
              Integrations
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Composio readiness, fallback health, and WhatsApp smoke tests
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Keep the connector control plane honest before wider production rollout.
            </div>
          </a>

          <a
            href="#telethon"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <RadioTower className="h-3.5 w-3.5" />
              Telegram Transport
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Identities, outbound queue, runner, and bindings
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Operate the MTProto layer without dropping into internal routes.
            </div>
          </a>

          <a
            href="#capability-commerce"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Layers3 className="h-3.5 w-3.5" />
              Internal Agents
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Loadouts and capability bindings
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Inspect what Matt-facing agents are actually equipped to do.
            </div>
          </a>

          <Link
            href="/ops/platform"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              Platform
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Workspaces, fleets, and Planck provisioning
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Create workspaces, provision Planck HQ, and inspect fleet topology.
            </div>
          </Link>

          <Link
            href="/ops/telegram-inventory"
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-400/10"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Boxes className="h-3.5 w-3.5" />
              Warm Inventory
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Telegram bot packs and transfer flow
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-400">
              Paste BotFather tokens, manage stock, assign packs, and track transfer.
            </div>
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        id="actions"
        eyebrow="Actions"
        title="Small write actions"
        description="This stays deliberately narrow. These are the first operational write paths needed to run Matt without rebuilding a giant admin tool."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <form
            action={seedMattRelationshipPackAction}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <UserRound className="h-3.5 w-3.5" />
              Seed relationship pack
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Create or repair Matt support/account manager assignments
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use a `User.id` from the database or from a ticket/thread on this page.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                name="userId"
                placeholder="Enter userId"
                className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6835] to-[#ffaa44] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,104,53,0.28)] transition hover:opacity-95"
              >
                Seed Matt Pack
              </button>
            </div>
          </form>

          <form
            action={queueInboundRelationshipTaskAction}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <RadioTower className="h-3.5 w-3.5" />
              Create Matt thread
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Seed a Telegram thread, task, and binding in one action
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This is the manual bootstrap path when a real customer thread needs to
              exist before the runner has handled inbound traffic on its own.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                type="text"
                name="userId"
                placeholder="User.id"
                className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="role"
                  defaultValue="support"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="support">Support</option>
                  <option value="account_manager">Account manager</option>
                </select>
                <select
                  name="telegramIdentityId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="" disabled>
                    Select Telethon identity
                  </option>
                  {data.telethonIdentities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {(identity.displayName ||
                        identity.externalTelegramUsername ||
                        shortId(identity.id)) +
                        ` (${identity.status})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  name="externalThreadId"
                  placeholder="Telegram chat ID"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
                <input
                  type="text"
                  name="externalUserId"
                  placeholder="Telegram peer ID (optional)"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
              </div>
              <textarea
                name="text"
                rows={4}
                placeholder="Initial inbound message snapshot"
                className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={data.telethonIdentities.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Thread and Binding
              </button>
              {data.telethonIdentities.length === 0 ? (
                <div className="text-sm text-amber-100">
                  Provision a Telethon identity first before using this action.
                </div>
              ) : null}
            </div>
          </form>

          <form
            action={processDeployJobsAction}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Bot className="h-3.5 w-3.5" />
              Process deploy queue
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Manually run queued deployment jobs
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Useful when payment confirmations landed but activation needs a manual queue
              push.
            </p>
            <div className="mt-4 flex gap-3">
              <input
                type="number"
                min={1}
                max={50}
                defaultValue={10}
                name="limit"
                className="w-28 rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#ffaa44]/30 bg-[#ffaa44]/15 px-4 py-3 text-sm font-semibold text-[#ffe3c5] transition hover:bg-[#ffaa44]/20"
              >
                Run Deploy Jobs
              </button>
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        id="integrations"
        eyebrow="Integrations"
        title="Composio-first readiness and WhatsApp transport"
        description="This is the production hardening view for Matt’s connector control plane. Validate Composio, watch Sesh fallback frequency, and run real outbound WhatsApp smoke tests from one place."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Composio ready"
            value={data.integrationMetrics.composioReadyCount}
            detail="Workspaces with validated catalog, account, session, and execution checks."
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <MetricCard
            label="Composio degraded"
            value={data.integrationMetrics.composioDegradedCount}
            detail="Configured workspaces still missing smoke tests, validation, or running on fallback."
            icon={<AlertCircle className="h-5 w-5" />}
          />
          <MetricCard
            label="Fallbacks 24h"
            value={data.integrationMetrics.fallbackUsedLast24h}
            detail="Recent Composio-to-Sesh fallbacks across tracked workspaces."
            icon={<Cable className="h-5 w-5" />}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="WhatsApp ready"
            value={data.integrationMetrics.whatsappReadyCount}
            detail="Workspaces with webhook, inbound, and outbound readiness all confirmed."
            icon={<MessageSquare className="h-5 w-5" />}
          />
          <MetricCard
            label="WhatsApp degraded"
            value={data.integrationMetrics.whatsappDegradedCount}
            detail="Configured WhatsApp channels still missing proof of inbound/outbound health."
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <MetricCard
            label="Webhook failures 24h"
            value={data.integrationMetrics.failedWebhookEventsLast24h}
            detail="Recent Sesh-to-Matt webhook failures recorded on WhatsApp workspaces."
            icon={<Workflow className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 space-y-4">
          {data.integrationWorkspaces.length === 0 ? (
            <EmptyState message="No workspaces have integration state yet." />
          ) : (
            data.integrationWorkspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-medium text-white">{workspace.name}</div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${integrationStatusTone(workspace.readiness.overallStatus)}`}
                        >
                          {workspace.readiness.overallStatus}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          {workspace.kind}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {workspace.slug} • {describeUser(workspace.owner)} • updated{" "}
                        {formatRelativeTime(workspace.updatedAt)}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-[var(--background)]/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">Composio</div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${integrationStatusTone(workspace.readiness.composio.status)}`}
                          >
                            {workspace.readiness.composio.status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-400">
                          <div>
                            Providers: {workspace.readiness.composio.connectedProviderCount}
                          </div>
                          <div>
                            Last provider: {workspace.readiness.composio.lastProviderUsed ?? "none"}
                          </div>
                          <div>
                            Last validation: {formatDateTime(workspace.readiness.composio.lastValidatedAt)}
                          </div>
                          <div>
                            Fallback 24h: {workspace.readiness.composio.fallbackCount24h}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[var(--background)]/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-white">WhatsApp</div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs ${integrationStatusTone(workspace.readiness.whatsapp.status)}`}
                          >
                            {workspace.readiness.whatsapp.status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-400">
                          <div>
                            Webhook {workspace.readiness.whatsapp.webhookReady ? "ready" : "not ready"} •
                            inbound {workspace.readiness.whatsapp.inboundReady ? "seen" : "waiting"} •
                            outbound {workspace.readiness.whatsapp.outboundReady ? "seen" : "waiting"}
                          </div>
                          <div>
                            Last inbound: {formatDateTime(workspace.readiness.whatsapp.lastInboundAt)}
                          </div>
                          <div>
                            Last outbound: {formatDateTime(workspace.readiness.whatsapp.lastOutboundAt)}
                          </div>
                          <div>
                            Webhook failures 24h: {workspace.readiness.whatsapp.failedWebhookEvents24h}
                          </div>
                        </div>
                      </div>
                    </div>

                    {workspace.readiness.blockingIssues.length > 0 ? (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {workspace.readiness.blockingIssues.join(" ")}
                      </div>
                    ) : null}
                    {workspace.readiness.warnings.length > 0 ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {workspace.readiness.warnings.join(" ")}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 xl:w-[26rem]">
                    <form
                      action={validateWorkspaceComposioAction}
                      className="rounded-2xl border border-white/10 bg-[var(--background)]/60 p-4"
                    >
                      <div className="text-sm font-medium text-white">Validate Composio</div>
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          name="smokeTestToolSlug"
                          placeholder="Optional tool slug for execution test"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <textarea
                          name="smokeTestInput"
                          rows={3}
                          placeholder='Optional JSON input, e.g. {"limit":1}'
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                        >
                          Validate Workspace
                        </button>
                      </div>
                    </form>

                    <form
                      action={smokeTestMattConnectorActionAction}
                      className="rounded-2xl border border-white/10 bg-[var(--background)]/60 p-4"
                    >
                      <div className="text-sm font-medium text-white">Run connector smoke test</div>
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          name="composioToolSlug"
                          placeholder="Composio tool slug"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <textarea
                          name="composioInput"
                          rows={3}
                          placeholder='JSON input, e.g. {"query":"latest ticket"}'
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <input
                          type="text"
                          name="fallbackProvider"
                          placeholder="Optional Sesh fallback provider"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <input
                          type="text"
                          name="fallbackAction"
                          placeholder="Optional Sesh fallback action"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ffaa44]/30 bg-[#ffaa44]/15 px-4 py-3 text-sm font-semibold text-[#ffe3c5] transition hover:bg-[#ffaa44]/20"
                        >
                          Run Connector Smoke Test
                        </button>
                      </div>
                    </form>

                    <form
                      action={smokeTestWhatsAppAction}
                      className="rounded-2xl border border-white/10 bg-[var(--background)]/60 p-4"
                    >
                      <div className="text-sm font-medium text-white">Run WhatsApp outbound test</div>
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <div className="mt-3 space-y-3">
                        <input
                          type="text"
                          name="to"
                          placeholder="Recipient phone number"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <textarea
                          name="text"
                          rows={3}
                          placeholder="Smoke-test message body"
                          className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                        />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                        >
                          Send WhatsApp Smoke Test
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active relationships"
          value={data.metrics.activeRelationships}
          detail="Customer accounts currently assigned to Matt support or account management."
          icon={<UserRound className="h-5 w-5" />}
        />
        <MetricCard
          label="Open tickets"
          value={data.metrics.openTickets}
          detail="Threads that still need ownership, response, or closure."
          icon={<Ticket className="h-5 w-5" />}
        />
        <MetricCard
          label="Queued tasks"
          value={data.metrics.activeTasks}
          detail="Fleet work that is queued, running, or waiting for approval."
          icon={<Workflow className="h-5 w-5" />}
        />
        <MetricCard
          label="Outbound queue"
          value={data.metrics.pendingOutbound}
          detail="Messages waiting on Telethon delivery or acknowledgement."
          icon={<RadioTower className="h-5 w-5" />}
        />
        <MetricCard
          label="Pending payments"
          value={data.metrics.pendingPayments}
          detail="Revenue events that have not fully cleared the webhook flow yet."
          icon={<CreditCard className="h-5 w-5" />}
        />
        <MetricCard
          label="Deploy jobs active"
          value={data.metrics.activeDeployJobs}
          detail="Queued or processing deployments that still affect customer activation."
          icon={<Bot className="h-5 w-5" />}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          id="readiness"
          eyebrow="Readiness"
          title="Environment and operating posture"
          description="The current app can only make money reliably if these pieces are wired. This checklist stays focused on the live revenue path and Matt transport stack."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {data.envChecks.map((check) => (
              <div
                key={check.key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{check.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {check.key}
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${check.ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"}`}
                  >
                    {check.ready ? "Ready" : "Missing"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {check.description}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="snapshot"
          eyebrow="Snapshot"
          title="Transport and Matt coverage"
          description="A quick read on whether the relationship layer and Telegram transport are actually seeded."
        >
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Telethon identities
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {data.metrics.telethonIdentityCount}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Active, pending, or errored MTProto identities in the app.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Active thread bindings
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {data.metrics.activeBindingCount}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Threads already mapped to a relationship, identity, and agent.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Matt internal agents
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {data.metrics.mattAgentCount}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Internal relationship or ops agents currently present in the app.
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100 sm:col-span-3 xl:col-span-1">
              <div className="font-medium text-white">Generated</div>
              <div className="mt-2">{formatDateTime(data.generatedAt)}</div>
              <div className="mt-1 text-amber-100/80">
                {formatRelativeTime(data.generatedAt)}. Refresh the page for a new
                snapshot.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          id="money-path"
          eyebrow="Money Path"
          title="Recent payments"
          description="Payments are the start of the revenue loop. If these stall, activation and trust stall with them."
        >
          <div className="space-y-3">
            {data.recentPayments.length === 0 ? (
              <EmptyState message="No payments yet." />
            ) : (
              data.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {formatMoney(payment.amount, payment.currency)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Purpose: {payment.paymentPurpose}
                      </div>
                      <div className="text-sm text-slate-400">
                        {payment.provider} • {payment.paymentMethodType ?? "unknown"} • user {shortId(payment.userId)}
                      </div>
                      <div className="text-sm text-slate-400">
                        Target {payment.targetType ?? "n/a"} /{" "}
                        {shortId(payment.targetId)}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(payment.createdAt)}</div>
                      <div className="mt-1">
                        {payment.confirmedAt
                          ? `Confirmed ${formatRelativeTime(payment.confirmedAt)}`
                          : `Expires ${formatRelativeTime(payment.expiresAt)}`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Session {shortId(payment.sessionId)}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Money Path"
          title="Deploy job queue"
          description="Deploy jobs are the bridge from payment confirmation to a working Matt or customer agent."
        >
          <div className="space-y-3">
            {data.deployJobs.length === 0 ? (
              <EmptyState message="No deploy jobs recorded yet." />
            ) : (
              data.deployJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {job.agent.name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {job.type} • attempt {job.attempts}/{job.maxAttempts}
                      </div>
                      <div className="text-sm text-slate-400">
                        Agent {job.agent.activationStatus} / deploy state {job.agent.deployState}
                      </div>
                      {job.errorMessage ? (
                        <div className="rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                          {trimCopy(job.errorMessage, 180)}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(job.createdAt)}</div>
                      <div className="mt-1">Next run {formatRelativeTime(job.nextRunAt)}</div>
                      <div className="mt-1">Last attempt {formatRelativeTime(job.lastAttemptAt)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Job {shortId(job.id)} • {job.agent.slug}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          id="relationships"
          eyebrow="Relationships"
          title="Matt assignments"
          description="These are the per-customer support and account-management relationships that make the product feel owned."
        >
          <div className="space-y-3">
            {data.relationships.length === 0 ? (
              <EmptyState message="No Matt relationships have been seeded yet." />
            ) : (
              data.relationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {describeUser(relationship.user)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(relationship.status)}`}
                        >
                          {relationship.role}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Assigned to {relationship.assignedAgent.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        SLA {relationship.slaTier} • {relationship._count.conversationThreads} threads
                        • {relationship._count.supportTickets} tickets •{" "}
                        {relationship._count.telegramThreadBindings} bindings
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(relationship.updatedAt)}</div>
                      <div className="mt-1">{relationship.assignedAgent.transportProvider}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Relationship {shortId(relationship.id)} • agent {relationship.assignedAgent.slug}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Relationships"
          title="Open tickets"
          description="Support issues still in motion. These should stay visible until the thread is clearly closed or handed off."
        >
          <div className="space-y-3">
            {data.tickets.length === 0 ? (
              <EmptyState message="No open or escalated support tickets." />
            ) : (
              data.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {ticket.subject}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(ticket.status)}`}
                        >
                          {ticket.status}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${priorityTone(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {describeUser(ticket.requester)} • {ticket.relationship?.role ?? "unassigned relationship"}
                      </div>
                      <div className="text-sm text-slate-400">
                        Agent {ticket.assignedAgent?.name ?? "none"} • thread{" "}
                        {ticket.conversationThread?.title ?? shortId(ticket.conversationThreadId)}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(ticket.updatedAt)}</div>
                      <div className="mt-1">{ticket.sourceChannel}</div>
                    </div>
                  </div>
                  {ticket.summary ? (
                    <div className="mt-3 text-sm leading-6 text-slate-400">
                      {trimCopy(ticket.summary, 180)}
                    </div>
                  ) : null}
                  <form
                    action={updateSupportTicketAction}
                    className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Ticket control
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        name="status"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {SUPPORT_TICKET_STATUS_CONTROL_OPTIONS.map((option) => (
                          <option
                            key={`${ticket.id}-${option.value || "ticket-status-none"}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="priority"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {SUPPORT_TICKET_PRIORITY_CONTROL_OPTIONS.map((option) => (
                          <option
                            key={`${ticket.id}-${option.value || "ticket-priority-none"}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="assignedAgentId"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        <option value="">No agent change</option>
                        <option value="__none__">Unassign agent</option>
                        {data.mattAgentOptions.map((agent) => (
                          <option key={`${ticket.id}-${agent.id}`} value={agent.id}>
                            {agent.name} ({agent.agentKind})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">
                        Assignment and priority changes also update the linked fleet task
                        when one exists.
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                      >
                        Apply Ticket Update
                      </button>
                    </div>
                  </form>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          id="tasking"
          eyebrow="Tasking"
          title="Fleet tasks"
          description="This is the hidden work queue behind Matt. Use it to spot backlog, approval bottlenecks, and stale customer handling."
        >
          <div className="space-y-3">
            {data.tasks.length === 0 ? (
              <EmptyState message="No fleet tasks in the system." />
            ) : (
              data.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">{task.title}</span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(task.status)}`}
                        >
                          {task.status}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${priorityTone(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {task.fleet.name} • {task.type}
                      </div>
                      <div className="text-sm text-slate-400">
                        Requester {describeUser(task.requester)} • agent{" "}
                        {task.assignedAgent?.name ?? "unassigned"}
                      </div>
                      <div className="text-sm leading-6 text-slate-400">
                        {trimCopy(describeTaskPayload(task.payload), 180)}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(task.createdAt)}</div>
                      <div className="mt-1">{formatRelativeTime(task.createdAt)}</div>
                      <div className="mt-1">
                        Ticket {task.ticket?.status ?? "none"} • thread{" "}
                        {task.conversationThread?.channel ?? "n/a"}
                      </div>
                    </div>
                  </div>
                  <form
                    action={dispatchFleetTaskAction}
                    className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <input type="hidden" name="taskId" value={task.id} />
                    <input
                      type="hidden"
                      name="enqueueTransport"
                      value={
                        task.assignedAgentId && task.conversationThreadId ? "true" : "false"
                      }
                    />
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Task control
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        name="status"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {TASK_UPDATE_STATUS_OPTIONS.map((option) => (
                          <option key={`${task.id}-${option.value || "status-none"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="ticketStatus"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {TASK_UPDATE_TICKET_STATUS_OPTIONS.map((option) => (
                          <option key={`${task.id}-${option.value || "ticket-none"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      name="responseText"
                      rows={3}
                      placeholder={
                        task.assignedAgentId && task.conversationThreadId
                          ? "Optional reply to queue through transport"
                          : "Optional internal result note"
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">
                        {task.assignedAgentId && task.conversationThreadId
                          ? "A reply here will queue outbound transport on the bound thread."
                          : "No assigned agent/thread yet, so reply text stays as task result only."}
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                      >
                        Apply Task Update
                      </button>
                    </div>
                  </form>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Threads"
          title="Recent conversation threads"
          description="A thread-first view makes it easier to reason about continuity than a giant admin CRUD table."
        >
          <div className="space-y-3">
            {data.threads.length === 0 ? (
              <EmptyState message="No conversation threads tracked yet." />
            ) : (
              data.threads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {thread.title || shortId(thread.id)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(thread.channel)}`}
                        >
                          {thread.channel}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {describeUser(thread.user)} • {thread.relationship?.role ?? "no relationship"}
                      </div>
                      <div className="text-sm text-slate-400">
                        {thread._count.supportTickets} tickets • {thread._count.fleetTasks} tasks
                        • {thread._count.outboundTransportMessages} outbound •{" "}
                        {thread._count.telegramThreadBindings} bindings
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(thread.lastMessageAt)}</div>
                      <div className="mt-1">Inbound {formatRelativeTime(thread.lastInboundAt)}</div>
                      <div className="mt-1">Outbound {formatRelativeTime(thread.lastOutboundAt)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    External thread {thread.externalThreadId}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          id="telethon"
          eyebrow="Telethon"
          title="Telegram identities"
          description="These identities back Matt support, account management, or employee-style agents on MTProto."
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <form
              action={provisionTelethonIdentityAction}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <RadioTower className="h-3.5 w-3.5" />
                Provision identity
              </div>
              <div className="mt-3 text-lg font-medium text-white">
                Add a Telethon runtime identity and optionally link it to a Matt agent
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use `pending` when credentials are not live yet. Use `active` only when
                the runner can actually authenticate with the provided session or bot
                token.
              </p>

              <div className="mt-4 grid gap-3">
                <input
                  type="text"
                  name="displayName"
                  placeholder="Display name"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="kind"
                    defaultValue="user_agent"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="user_agent">User agent</option>
                    <option value="bot">Bot</option>
                  </select>
                  <select
                    name="status"
                    defaultValue="pending"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="ownershipType"
                    defaultValue="meetmatt_managed"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="meetmatt_managed">MeetMatt managed</option>
                    <option value="customer_owned">Customer owned</option>
                  </select>
                  <select
                    name="linkedAgentId"
                    defaultValue=""
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  >
                    <option value="">No linked agent</option>
                    {data.mattAgentOptions.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.agentKind})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    name="externalTelegramUsername"
                    placeholder="Telegram username"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    name="externalTelegramUserId"
                    placeholder="Telegram user ID"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    name="externalPhone"
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    name="runtimeLabel"
                    placeholder="Runtime label"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                </div>

                <input
                  type="text"
                  name="userId"
                  placeholder="User.id owner (optional)"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />

                <textarea
                  name="session"
                  rows={4}
                  placeholder="Telethon session string for user_agent"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />

                <input
                  type="password"
                  name="botToken"
                  placeholder="Telegram bot token for bot identities"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Provision Telethon Identity
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {data.telethonIdentities.length === 0 ? (
                <EmptyState message="No Telethon identities have been provisioned yet." />
              ) : (
                data.telethonIdentities.map((identity) => (
                  <div
                    key={identity.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-medium text-white">
                            {identity.displayName ||
                              identity.externalTelegramUsername ||
                              shortId(identity.id)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(identity.status)}`}
                          >
                            {identity.status}
                          </span>
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                            {identity.kind}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">
                          Owner {describeUser(identity.user)} • {identity.ownershipType}
                        </div>
                        <div className="text-sm text-slate-400">
                          {identity._count.threadBindings} thread bindings •{" "}
                          {identity.agentLinks.length} linked agents
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {identity.agentLinks.map((link) => (
                            <span
                              key={link.agentId}
                              className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
                            >
                              {link.agent.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-400">
                        <div>{formatDateTime(identity.lastHeartbeatAt)}</div>
                        <div className="mt-1">{identity.runtimeLabel ?? "No runtime label"}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Telethon"
          title="Outbound queue"
          description="If outbound stalls here, Matt appears unresponsive even when the reasoning layer is working."
        >
          <div className="space-y-3">
            {data.outboundMessages.length === 0 ? (
              <EmptyState message="No outbound transport messages are queued or failed." />
            ) : (
              data.outboundMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {message.agent.name}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(message.status)}`}
                        >
                          {message.status}
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                          {message.type}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        Identity {message.telegramIdentity.displayName || shortId(message.telegramIdentityId)}
                      </div>
                      <div className="text-sm leading-6 text-slate-400">
                        {trimCopy(describeOutboundPayload(message.payload), 180)}
                      </div>
                      <div className="text-sm text-slate-400">
                        Thread {message.conversationThread?.title ?? shortId(message.conversationThreadId)} • task{" "}
                        {message.fleetTask?.status ?? "none"}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(message.updatedAt)}</div>
                      <div className="mt-1">
                        Attempt {message.attempts}/{message.maxAttempts}
                      </div>
                      <div className="mt-1">Next run {formatRelativeTime(message.nextRunAt)}</div>
                    </div>
                  </div>
                  {message.errorMessage ? (
                    <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      {trimCopy(message.errorMessage, 180)}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Message {shortId(message.id)}
                    </div>
                    <form action={replayOutboundTransportMessageAction}>
                      <input type="hidden" name="messageId" value={message.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ffaa44]/30 bg-[#ffaa44]/15 px-4 py-2.5 text-sm font-semibold text-[#ffe3c5] transition hover:bg-[#ffaa44]/20"
                      >
                        {message.status === "failed" ? "Replay outbound" : "Re-queue now"}
                      </button>
                    </form>
                  </div>
                  <form
                    action={acknowledgeOutboundTransportMessageAction}
                    className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <input type="hidden" name="messageId" value={message.id} />
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Apply delivery ack
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        name="status"
                        defaultValue="sent"
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {OUTBOUND_ACK_STATUS_OPTIONS.map((option) => (
                          <option key={`${message.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="taskStatus"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {TASK_UPDATE_STATUS_OPTIONS.map((option) => (
                          <option key={`${message.id}-task-${option.value || "none"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="ticketStatus"
                        defaultValue=""
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      >
                        {TASK_UPDATE_TICKET_STATUS_OPTIONS.map((option) => (
                          <option key={`${message.id}-ticket-${option.value || "none"}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        name="responseExternalMessageId"
                        placeholder="Telegram message id"
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      />
                      <input
                        type="text"
                        name="errorCode"
                        placeholder="Error code (optional)"
                        className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                      />
                    </div>
                    <input
                      type="text"
                      name="errorMessage"
                      placeholder="Error message (optional)"
                      className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                    >
                      Apply Ack
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        id="runner-toolbox"
        eyebrow="Telethon"
        title="Runner toolbox"
        description="These controls exercise the same heartbeat and outbound-poll surfaces the Python Telethon runner uses. They are useful before the persistent worker is deployed or when debugging transport state."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            action={sendTelethonHeartbeatAction}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <RadioTower className="h-3.5 w-3.5" />
              Runner heartbeat
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Record a heartbeat for one Telethon identity
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This updates the same identity heartbeat state the runner would push on its
              interval loop.
            </p>
            <div className="mt-4 grid gap-3">
              <select
                name="telegramIdentityId"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              >
                <option value="" disabled>
                  Select Telethon identity
                </option>
                {data.telethonIdentities.map((identity) => (
                  <option key={`heartbeat-${identity.id}`} value={identity.id}>
                    {(identity.displayName ||
                      identity.externalTelegramUsername ||
                      shortId(identity.id)) +
                      ` (${identity.status})`}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="connected"
                  defaultValue="true"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="true">Connected</option>
                  <option value="false">Disconnected</option>
                </select>
                <input
                  type="text"
                  name="runner"
                  defaultValue="ops-console"
                  placeholder="Runner name"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                disabled={data.telethonIdentities.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send Heartbeat
              </button>
            </div>
          </form>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <form
              action={claimTelethonOutboundAction}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <Bot className="h-3.5 w-3.5" />
                Runner outbound poll
              </div>
              <div className="mt-3 text-lg font-medium text-white">
                Claim outbound transport work
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This marks queued transport messages as claimed, which is the same first
                step the runner takes before sending them through Telegram.
              </p>
              <div className="mt-4 grid gap-3">
                <select
                  name="telegramIdentityId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">All identities</option>
                  {data.telethonIdentities.map((identity) => (
                    <option key={`claim-${identity.id}`} value={identity.id}>
                      {(identity.displayName ||
                        identity.externalTelegramUsername ||
                        shortId(identity.id)) +
                        ` (${identity.status})`}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={10}
                    name="limit"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    name="claimedBy"
                    defaultValue="ops-console"
                    placeholder="Claimed by"
                    className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ffaa44]/30 bg-[#ffaa44]/15 px-4 py-3 text-sm font-semibold text-[#ffe3c5] transition hover:bg-[#ffaa44]/20"
                >
                  Claim Outbound Work
                </button>
              </div>
            </form>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Runner playbook
              </div>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-400">
                <p>
                  Provision identity in `/ops`, then send a heartbeat to move it into an
                  active or error state without waiting for the worker loop.
                </p>
                <p>
                  Queue replies from a fleet task or outbound card, then use claim to
                  verify the app-side transport queue is handing work to a runner.
                </p>
                <p>
                  The persistent worker still lives in
                  `services/telethon-runner/`, and this toolbox is for app-path validation
                  before that worker is live.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="thread-bindings"
        eyebrow="Telethon"
        title="Thread bindings"
        description="Bindings are the transport map between Telegram chats, Matt relationships, conversation threads, and the identity that will actually send or receive."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            action={upsertTelegramThreadBindingAction}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <RadioTower className="h-3.5 w-3.5" />
              Upsert binding
            </div>
            <div className="mt-3 text-lg font-medium text-white">
              Create or repair a Telegram thread binding directly
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use this when the thread already exists and you need to repair the mapping
              without generating a fresh inbound task.
            </p>
            <div className="mt-4 grid gap-3">
              <select
                name="telegramIdentityId"
                defaultValue=""
                className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              >
                <option value="" disabled>
                  Select Telethon identity
                </option>
                {data.telethonIdentities.map((identity) => (
                  <option key={`binding-identity-${identity.id}`} value={identity.id}>
                    {(identity.displayName ||
                      identity.externalTelegramUsername ||
                      shortId(identity.id)) +
                      ` (${identity.status})`}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  name="externalChatId"
                  placeholder="Telegram chat ID"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
                <input
                  type="text"
                  name="externalPeerId"
                  placeholder="Telegram peer ID"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="conversationThreadId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">No conversation thread</option>
                  {data.threads.map((thread) => (
                    <option key={`binding-thread-${thread.id}`} value={thread.id}>
                      {(thread.title || shortId(thread.id)) + ` (${thread.channel})`}
                    </option>
                  ))}
                </select>
                <select
                  name="bindingType"
                  defaultValue="matt_relationship"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  {THREAD_BINDING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  name="userId"
                  placeholder="User.id"
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                />
                <select
                  name="agentId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">No agent</option>
                  {data.mattAgentOptions.map((agent) => (
                    <option key={`binding-agent-${agent.id}`} value={agent.id}>
                      {agent.name} ({agent.agentKind})
                    </option>
                  ))}
                </select>
                <select
                  name="relationshipId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-white/10 bg-[var(--background)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="">No relationship</option>
                  {data.relationships.map((relationship) => (
                    <option
                      key={`binding-relationship-${relationship.id}`}
                      value={relationship.id}
                    >
                      {describeUser(relationship.user)} ({relationship.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
                  <input type="checkbox" name="touchInbound" value="true" />
                  Touch inbound timestamp
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
                  <input type="checkbox" name="touchOutbound" value="true" />
                  Touch outbound timestamp
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Save Thread Binding
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {data.threadBindings.length === 0 ? (
              <EmptyState message="No Telegram thread bindings recorded yet." />
            ) : (
              data.threadBindings.map((binding) => (
                <div
                  key={binding.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-white">
                          {binding.conversationThread?.title ||
                            binding.externalChatId ||
                            shortId(binding.id)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(binding.status)}`}
                        >
                          {binding.status}
                        </span>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                          {binding.bindingType}
                        </span>
                      </div>
                      <div className="text-sm text-slate-300">
                        {describeUser(binding.user)} •{" "}
                        {binding.relationship?.role ?? "no relationship"}
                      </div>
                      <div className="text-sm text-slate-400">
                        Identity{" "}
                        {binding.telegramIdentity.displayName ||
                          binding.telegramIdentity.externalTelegramUsername ||
                          shortId(binding.telegramIdentityId)}{" "}
                        • agent {binding.agent?.name ?? "none"}
                      </div>
                      <div className="text-sm text-slate-400">
                        Chat {binding.externalChatId} • peer {binding.externalPeerId ?? "n/a"}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{formatDateTime(binding.updatedAt)}</div>
                      <div className="mt-1">
                        Inbound {formatRelativeTime(binding.lastInboundAt)}
                      </div>
                      <div className="mt-1">
                        Outbound {formatRelativeTime(binding.lastOutboundAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="capability-commerce"
        eyebrow="Capability Commerce"
        title="Matt internal agent loadouts"
        description="This is the important internal view of what each Matt-facing agent is actually equipped to do: items, bindings, and active entitlement packs."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {data.mattAgents.length === 0 ? (
            <EmptyState message="No internal Matt agents found." />
          ) : (
            data.mattAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-medium text-white">{agent.name}</span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${statusTone(agent.status)}`}
                      >
                        {agent.status}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                        {agent.agentKind}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300">
                      {agent.useCaseTemplate?.name ?? "No use-case template"} • cortex{" "}
                      {agent.cortexId}
                    </div>
                    <div className="text-sm text-slate-400">
                      {agent.transportProvider} • worker tier {agent.workerTier} •{" "}
                      {agent.activationStatus}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-400">
                    <div>{formatDateTime(agent.updatedAt)}</div>
                    <div className="mt-1">{agent._count.assignedFleetTasks} assigned tasks</div>
                    <div className="mt-1">{agent._count.outboundTransportMessages} outbound msgs</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      <Layers3 className="h-3.5 w-3.5" />
                      Loadout items
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {agent.loadoutItems.length === 0 ? (
                        <span className="text-sm text-slate-500">No items attached</span>
                      ) : (
                        agent.loadoutItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100"
                          >
                            {item.catalogItem.name}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Total {agent._count.loadoutItems} items
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      <Cable className="h-3.5 w-3.5" />
                      Skill bindings
                    </div>
                    <div className="mt-3 space-y-2">
                      {agent.skillBindings.length === 0 ? (
                        <span className="text-sm text-slate-500">No skills resolved</span>
                      ) : (
                        agent.skillBindings.map((binding) => (
                          <div
                            key={binding.id}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="text-sm font-medium text-white">
                              {binding.skillDefinition.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {binding.defaultImplementation?.implementationKey ?? "No default implementation"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Total {agent._count.skillBindings} bindings
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active grants
                    </div>
                    <div className="mt-3 space-y-2">
                      {agent.entitlementPackGrants.length === 0 ? (
                        <span className="text-sm text-slate-500">No active packs</span>
                      ) : (
                        agent.entitlementPackGrants.map((grant) => (
                          <div
                            key={grant.id}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="text-sm font-medium text-white">
                              {grant.entitlementPack.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {grant.entitlementPack.grantType} • ends{" "}
                              {grant.endsAt ? formatDateTime(grant.endsAt) : "open"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {grant.allowances.slice(0, 3).map((allowance) => (
                                <span
                                  key={`${grant.id}-${allowance.meterKey}-${allowance.skillDefinition.slug}`}
                                  className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100"
                                >
                                  {allowance.skillDefinition.name}:{" "}
                                  {allowance.remainingUnits ?? "unbounded"}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Total {agent._count.entitlementPackGrants} grants
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <section className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-white">Current limitation</div>
            <p className="mt-2 max-w-4xl">
              This first ops pass stays intentionally thin. It now covers relationship
              seeding, Telegram thread bootstrap, deploy queue processing, and outbound
              replay without reopening the old backoffice scope. The next step is direct
              Telethon identity provisioning and richer ticket/task controls from the same
              surface.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
