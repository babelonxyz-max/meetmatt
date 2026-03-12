import { Prisma } from "@prisma/client";
import {
  AGENT_KIND,
  BRAIN_PROVIDER,
  OWNER_TYPE,
  TRANSPORT_PROVIDER,
  defaultCortexIdForAgentKind,
} from "@/lib/agent-blueprint";
import { provisionAgentUseCaseBundle } from "@/lib/capability-commerce/provisioning";
import { USE_CASE_TEMPLATE_SLUG } from "@/lib/capability-commerce/registry";
import { prisma } from "@/lib/prisma";
import {
  TELEGRAM_IDENTITY_KIND,
  TELEGRAM_IDENTITY_OWNERSHIP,
  TELEGRAM_IDENTITY_STATUS,
  provisionTelegramIdentity,
  updateTelegramIdentityCredentials,
} from "@/lib/telegram-identities";
import {
  ensurePersonalWorkspaceForUser,
  resolveWorkspaceAccessForUser,
} from "@/lib/workspaces";

export type PlanckSeatToolAccess = "read" | "draft" | "execute_low_risk";

export interface PlanckSeatTool {
  toolId: string;
  access: PlanckSeatToolAccess;
}

export interface PlanckSeatHandoff {
  toSeatId: string;
  trigger: string;
  artifact: string;
}

export interface PlanckHqSeatDefinition {
  pixelEmployeeId: string;
  seatId: string;
  bindingId: string;
  displayName: string;
  title: string;
  department: string;
  team: string;
  reportsTo?: string;
  sourceRoleTemplate?: string;
  workflowLanes: string[];
  skills: string[];
  tools: PlanckSeatTool[];
  policies: string[];
  outputs: string[];
  routines: string[];
  handoffs: PlanckSeatHandoff[];
}

export interface PlanckSeatCredentialInput {
  botToken?: string | null;
  session?: string | null;
  externalTelegramUsername?: string | null;
  externalTelegramUserId?: string | null;
  externalPhone?: string | null;
  runtimeLabel?: string | null;
  displayName?: string | null;
  status?: string | null;
}

export interface PlanckHqFleetProvisionParams {
  userId: string;
  workspaceId?: string | null;
  identityOwnershipType?: string | null;
  identityStatus?: string | null;
  seatCredentials?: Record<string, PlanckSeatCredentialInput> | null;
}

export interface PlanckHqSeatProvisionResult {
  seatId: string;
  displayName: string;
  title: string;
  agentId: string;
  agentSlug: string;
  telegramIdentityId: string;
  createdAgent: boolean;
  createdIdentity: boolean;
  updatedIdentity: boolean;
  hasCredentials: boolean;
  externalTelegramUsername: string | null;
  runtimeLabel: string | null;
}

export interface PlanckHqFleetProvisionResult {
  userId: string;
  workspaceId: string;
  totalSeats: number;
  createdAgents: number;
  createdIdentities: number;
  updatedIdentities: number;
  seats: PlanckHqSeatProvisionResult[];
}

const PLANCK_TOOL_BUNDLES = {
  revenueCore: [
    { toolId: "tool.crm", access: "execute_low_risk" },
    { toolId: "tool.email", access: "execute_low_risk" },
    { toolId: "tool.calendar", access: "execute_low_risk" },
    { toolId: "tool.analytics", access: "read" },
  ] satisfies PlanckSeatTool[],
  customerCore: [
    { toolId: "tool.crm", access: "execute_low_risk" },
    { toolId: "tool.docs", access: "read" },
    { toolId: "tool.support-desk", access: "execute_low_risk" },
    { toolId: "tool.analytics", access: "read" },
    { toolId: "tool.calendar", access: "execute_low_risk" },
  ] satisfies PlanckSeatTool[],
  productCore: [
    { toolId: "tool.project-board", access: "execute_low_risk" },
    { toolId: "tool.docs", access: "execute_low_risk" },
    { toolId: "tool.analytics", access: "read" },
    { toolId: "tool.crm", access: "read" },
  ] satisfies PlanckSeatTool[],
  engineeringCore: [
    { toolId: "tool.code-review", access: "execute_low_risk" },
    { toolId: "tool.docs", access: "execute_low_risk" },
    { toolId: "tool.project-board", access: "execute_low_risk" },
    { toolId: "tool.qa", access: "execute_low_risk" },
  ] satisfies PlanckSeatTool[],
  financeCore: [
    { toolId: "tool.billing", access: "execute_low_risk" },
    { toolId: "tool.reporting", access: "read" },
    { toolId: "tool.crm", access: "read" },
    { toolId: "tool.data-room", access: "execute_low_risk" },
  ] satisfies PlanckSeatTool[],
  marketingCore: [
    { toolId: "tool.docs", access: "execute_low_risk" },
    { toolId: "tool.analytics", access: "read" },
    { toolId: "tool.releases", access: "read" },
    { toolId: "tool.email", access: "execute_low_risk" },
    { toolId: "tool.social", access: "execute_low_risk" },
    { toolId: "tool.cms", access: "execute_low_risk" },
  ] satisfies PlanckSeatTool[],
  legalCore: [
    { toolId: "tool.docs", access: "execute_low_risk" },
    { toolId: "tool.contract-repo", access: "execute_low_risk" },
    { toolId: "tool.data-room", access: "read" },
    { toolId: "tool.reporting", access: "read" },
  ] satisfies PlanckSeatTool[],
};

function withBundle(
  ...bundleNames: Array<keyof typeof PLANCK_TOOL_BUNDLES>
): PlanckSeatTool[] {
  return bundleNames.flatMap((bundleName) => PLANCK_TOOL_BUNDLES[bundleName]);
}

function seat(config: PlanckHqSeatDefinition): PlanckHqSeatDefinition {
  return config;
}

export const PLANCK_HQ_BOT_SEATS: PlanckHqSeatDefinition[] = [
  seat({
    pixelEmployeeId: "employee.planck.george",
    seatId: "seat.planck.hq.cro.george",
    bindingId: "binding.planck.hq.george",
    displayName: "George",
    title: "Chief Revenue Officer",
    department: "Revenue",
    team: "Revenue",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.planck.sales-agent",
    workflowLanes: ["lane.revenue"],
    skills: [
      "skill.outreach",
      "skill.lead-qualification",
      "skill.follow-up-sequencing",
      "skill.renewal-and-expansion",
    ],
    tools: withBundle("revenueCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.commercial-terms-human-approval",
    ],
    outputs: [
      "output.sales.qualified-partner-brief",
      "output.sales.pipeline-update",
      "output.revenue.forecast-note",
    ],
    routines: [
      "routine.revenue.daily-prioritization",
      "routine.revenue.weekly-pipeline",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.onboarding.matt",
        trigger: "A partner signs or commits to implementation.",
        artifact: "Qualified partner brief",
      },
      {
        toSeatId: "seat.planck.hq.assistant.kate",
        trigger: "A qualified meeting needs founder context and scheduling.",
        artifact: "Meeting brief request",
      },
      {
        toSeatId: "seat.planck.hq.accounts.anna",
        trigger: "A strategic account needs long-term ownership or renewal planning.",
        artifact: "Strategic account note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.matt",
    seatId: "seat.planck.hq.onboarding.matt",
    bindingId: "binding.planck.hq.matt",
    displayName: "Matt",
    title: "Head of Onboarding",
    department: "Customer Operations",
    team: "Customer Ops",
    reportsTo: "employee.planck.george",
    sourceRoleTemplate: "role.planck.onboarding-agent",
    workflowLanes: ["lane.onboarding"],
    skills: [
      "skill.onboarding-activation",
      "skill.support-triage",
      "skill.follow-up-sequencing",
    ],
    tools: withBundle("customerCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
    ],
    outputs: [
      "output.onboarding.activation-plan",
      "output.onboarding.risk-flag",
      "output.onboarding.go-live-checklist",
    ],
    routines: [
      "routine.onboarding.daily-check",
      "routine.onboarding.weekly-review",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.success.lara",
        trigger: "An onboarded partner shows adoption risk during activation.",
        artifact: "Adoption risk note",
      },
      {
        toSeatId: "seat.planck.hq.accounts.anna",
        trigger: "The partner reaches first value and needs ongoing ownership.",
        artifact: "Activation summary",
      },
      {
        toSeatId: "seat.planck.hq.cto.ash",
        trigger: "A technical blocker prevents activation or go-live.",
        artifact: "Technical blocker brief",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.lara",
    seatId: "seat.planck.hq.success.lara",
    bindingId: "binding.planck.hq.lara",
    displayName: "Lara",
    title: "Customer Success Manager",
    department: "Customer Success",
    team: "Customer Success",
    reportsTo: "employee.planck.george",
    sourceRoleTemplate: "role.planck.support-agent",
    workflowLanes: ["lane.customer-success"],
    skills: [
      "skill.support-triage",
      "skill.feedback-synthesis",
      "skill.tenant-health-monitoring",
    ],
    tools: [
      { toolId: "tool.support-desk", access: "execute_low_risk" },
      { toolId: "tool.knowledge-base", access: "read" },
      { toolId: "tool.crm", access: "read" },
      { toolId: "tool.analytics", access: "read" },
      { toolId: "tool.project-board", access: "execute_low_risk" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.support-no-legal-security-commitments",
    ],
    outputs: [
      "output.success.reply",
      "output.success.risk-summary",
      "output.success.theme-memo",
    ],
    routines: [
      "routine.success.daily-inbox-triage",
      "routine.success.weekly-theme-review",
      "routine.success.weekly-health-check",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.accounts.anna",
        trigger: "Support signals indicate churn risk or expansion opportunity.",
        artifact: "Account risk note",
      },
      {
        toSeatId: "seat.planck.hq.cpo.emil",
        trigger: "Recurring issues should become a product decision item.",
        artifact: "Feedback memo",
      },
      {
        toSeatId: "seat.planck.hq.legal.harvey",
        trigger: "A customer issue becomes legally sensitive.",
        artifact: "Customer dispute note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.anna",
    seatId: "seat.planck.hq.accounts.anna",
    bindingId: "binding.planck.hq.anna",
    displayName: "Anna",
    title: "Key Account Manager",
    department: "Customer Success",
    team: "Customer Success",
    reportsTo: "employee.planck.george",
    sourceRoleTemplate: "role.planck.account-manager-agent",
    workflowLanes: ["lane.customer-success", "lane.revenue"],
    skills: [
      "skill.tenant-health-monitoring",
      "skill.renewal-and-expansion",
      "skill.follow-up-sequencing",
    ],
    tools: [
      { toolId: "tool.crm", access: "execute_low_risk" },
      { toolId: "tool.analytics", access: "read" },
      { toolId: "tool.reporting", access: "read" },
      { toolId: "tool.email", access: "execute_low_risk" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.commercial-terms-human-approval",
    ],
    outputs: [
      "output.account.health-summary",
      "output.account.expansion-brief",
      "output.account.renewal-plan",
    ],
    routines: ["routine.account.daily-health", "routine.account.weekly-qbr"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cfo.felix",
        trigger: "Receivable risk or collections follow-up needs finance context.",
        artifact: "Collections context request",
      },
      {
        toSeatId: "seat.planck.hq.cro.george",
        trigger: "An account shows commercial expansion potential.",
        artifact: "Expansion recommendation",
      },
      {
        toSeatId: "seat.planck.hq.cpo.emil",
        trigger: "Usage trends expose a product blocker.",
        artifact: "Product blocker memo",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.tara",
    seatId: "seat.planck.hq.reliability.tara",
    bindingId: "binding.planck.hq.tara",
    displayName: "Tara",
    title: "Reliability Officer",
    department: "Quality",
    team: "Quality",
    reportsTo: "employee.planck.ash",
    sourceRoleTemplate: "role.planck.qa-agent",
    workflowLanes: ["lane.product-shipping"],
    skills: ["skill.qa-regression", "skill.incident-triage"],
    tools: [
      { toolId: "tool.qa", access: "execute_low_risk" },
      { toolId: "tool.project-board", access: "execute_low_risk" },
      { toolId: "tool.docs", access: "read" },
      { toolId: "tool.analytics", access: "read" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.no-production-merge",
      "policy.delivery-date-human-approval",
    ],
    outputs: [
      "output.qa.report",
      "output.qa.bug",
      "output.qa.incident-summary",
    ],
    routines: [
      "routine.qa.release-pass",
      "routine.qa.regression-maintenance",
      "routine.qa.incident-review",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cto.ash",
        trigger: "A defect, release risk, or doc gap needs engineering review.",
        artifact: "Bug report",
      },
      {
        toSeatId: "seat.planck.hq.pm.oscar",
        trigger: "Release risk affects schedule or scope.",
        artifact: "Release risk brief",
      },
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "A release is approved and launch messaging can start.",
        artifact: "Release recommendation",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.emil",
    seatId: "seat.planck.hq.cpo.emil",
    bindingId: "binding.planck.hq.emil",
    displayName: "Emil",
    title: "Chief Product Officer",
    department: "Product",
    team: "Product",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.meetmatt.product-manager-agent",
    workflowLanes: ["lane.product-shipping"],
    skills: [
      "skill.feedback-synthesis",
      "skill.prd-authoring",
      "skill.roadmap-planning",
    ],
    tools: withBundle("productCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.roadmap-human-approval",
    ],
    outputs: [
      "output.pm.prd",
      "output.pm.priority-memo",
      "output.pm.roadmap-update",
    ],
    routines: ["routine.pm.feedback-review", "routine.pm.roadmap-sync"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cto.ash",
        trigger: "A PRD needs technical review or architecture input.",
        artifact: "PRD draft",
      },
      {
        toSeatId: "seat.planck.hq.pm.oscar",
        trigger: "An approved initiative needs an execution plan.",
        artifact: "Delivery kickoff brief",
      },
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "A feature is approved for launch packaging.",
        artifact: "Launch brief",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.ash",
    seatId: "seat.planck.hq.cto.ash",
    bindingId: "binding.planck.hq.ash",
    displayName: "Ash",
    title: "Chief Technical Officer",
    department: "Engineering",
    team: "Engineering",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.meetmatt.developer-agent",
    workflowLanes: ["lane.product-shipping"],
    skills: [
      "skill.code-review-and-docs",
      "skill.partner-technical-support",
      "skill.qa-regression",
      "skill.architecture-review",
    ],
    tools: withBundle("engineeringCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.no-production-merge",
    ],
    outputs: [
      "output.dev.review-findings",
      "output.dev.architecture-note",
      "output.dev.technical-risk-note",
    ],
    routines: [
      "routine.dev.review-queue",
      "routine.dev.docs-refresh",
      "routine.dev.architecture-review",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.reliability.tara",
        trigger: "A change or bug fix needs explicit regression coverage.",
        artifact: "QA request",
      },
      {
        toSeatId: "seat.planck.hq.cpo.emil",
        trigger: "Technical review exposes product tradeoffs or scope risk.",
        artifact: "Technical note",
      },
      {
        toSeatId: "seat.planck.hq.pm.oscar",
        trigger: "Execution depends on delivery sequencing or cross-team coordination.",
        artifact: "Dependency note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.martin",
    seatId: "seat.planck.hq.ir.martin",
    bindingId: "binding.planck.hq.martin",
    displayName: "Martin",
    title: "Investor Relations",
    department: "Finance",
    team: "Finance",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.meetmatt.investor-relations-agent",
    workflowLanes: ["lane.finance"],
    skills: [
      "skill.investor-updates-and-data-room",
      "skill.finance-reporting",
    ],
    tools: [
      { toolId: "tool.investor-crm", access: "execute_low_risk" },
      { toolId: "tool.data-room", access: "execute_low_risk" },
      { toolId: "tool.reporting", access: "read" },
      { toolId: "tool.email", access: "draft" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.investor-confidentiality",
    ],
    outputs: [
      "output.ir.update",
      "output.ir.data-room-check",
      "output.ir.follow-up-list",
    ],
    routines: ["routine.ir.monthly-update", "routine.ir.data-room-review"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cfo.felix",
        trigger: "Financial metrics or cash views need confirmation.",
        artifact: "Metric request",
      },
      {
        toSeatId: "seat.planck.hq.assistant.kate",
        trigger: "Founder prep or send-off is needed.",
        artifact: "Founder send brief",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.kate",
    seatId: "seat.planck.hq.assistant.kate",
    bindingId: "binding.planck.hq.kate",
    displayName: "Kate",
    title: "CEO Assistant",
    department: "Executive Ops",
    team: "Executive Ops",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.shared.ceo-assistant",
    workflowLanes: ["lane.founder-ops"],
    skills: ["skill.founder-ops", "skill.delivery-orchestration"],
    tools: [
      { toolId: "tool.calendar", access: "execute_low_risk" },
      { toolId: "tool.project-board", access: "execute_low_risk" },
      { toolId: "tool.reporting", access: "read" },
      { toolId: "tool.email", access: "draft" },
    ],
    policies: ["policy.audit-trail-required", "policy.read-draft-propose"],
    outputs: [
      "output.assistant.priority-brief",
      "output.assistant.meeting-brief",
      "output.assistant.follow-up-list",
    ],
    routines: ["routine.assistant.daily-brief", "routine.assistant.weekly-review"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cfo.felix",
        trigger: "A founder brief needs finance context or approval items.",
        artifact: "Finance request",
      },
      {
        toSeatId: "seat.planck.hq.cro.george",
        trigger: "A founder priority needs revenue execution.",
        artifact: "Priority directive",
      },
      {
        toSeatId: "seat.planck.hq.cpo.emil",
        trigger: "A founder priority needs product execution.",
        artifact: "Priority directive",
      },
      {
        toSeatId: "seat.planck.hq.pm.oscar",
        trigger: "Cross-functional execution needs active follow-up.",
        artifact: "Execution tracking request",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.felix",
    seatId: "seat.planck.hq.cfo.felix",
    bindingId: "binding.planck.hq.felix",
    displayName: "Felix",
    title: "Chief Financial Officer",
    department: "Finance",
    team: "Finance",
    reportsTo: "employee.planck.mark",
    sourceRoleTemplate: "role.shared.finance-agent",
    workflowLanes: ["lane.finance"],
    skills: ["skill.invoicing-and-cashflow", "skill.finance-reporting"],
    tools: withBundle("financeCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.no-cash-movement",
      "policy.legal-review-required",
    ],
    outputs: [
      "output.finance.invoice",
      "output.finance.cash-summary",
      "output.finance.collections-report",
      "output.finance.board-note",
    ],
    routines: [
      "routine.finance.weekly-cash",
      "routine.finance.invoice-cycle",
      "routine.finance.monthly-board-pack",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.assistant.kate",
        trigger: "Founder review or approval is required.",
        artifact: "Approval queue",
      },
      {
        toSeatId: "seat.planck.hq.accounts.anna",
        trigger: "Receivables need customer context.",
        artifact: "Collections context request",
      },
      {
        toSeatId: "seat.planck.hq.ir.martin",
        trigger: "Investor reporting needs verified metrics.",
        artifact: "Metric summary",
      },
      {
        toSeatId: "seat.planck.hq.legal.harvey",
        trigger: "A contract or compliance issue affects finance.",
        artifact: "Finance legal note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.oscar",
    seatId: "seat.planck.hq.pm.oscar",
    bindingId: "binding.planck.hq.oscar",
    displayName: "Oscar",
    title: "Project Manager",
    department: "Operations",
    team: "Operations",
    reportsTo: "employee.planck.mark",
    workflowLanes: ["lane.product-shipping", "lane.founder-ops"],
    skills: [
      "skill.delivery-orchestration",
      "skill.roadmap-planning",
      "skill.incident-triage",
    ],
    tools: [
      { toolId: "tool.project-board", access: "execute_low_risk" },
      { toolId: "tool.docs", access: "execute_low_risk" },
      { toolId: "tool.calendar", access: "execute_low_risk" },
      { toolId: "tool.reporting", access: "read" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.delivery-date-human-approval",
    ],
    outputs: [
      "output.pm.delivery-plan",
      "output.pm.dependency-map",
      "output.pm.release-brief",
    ],
    routines: [
      "routine.pm.daily-standup-brief",
      "routine.pm.weekly-delivery-review",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cpo.emil",
        trigger: "Delivery risk creates a scope conflict.",
        artifact: "Scope risk note",
      },
      {
        toSeatId: "seat.planck.hq.cto.ash",
        trigger: "A delivery plan depends on technical decisions or blockers.",
        artifact: "Dependency map",
      },
      {
        toSeatId: "seat.planck.hq.reliability.tara",
        trigger: "Release readiness or QA confidence is unclear.",
        artifact: "Release readiness request",
      },
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "Launch timing changes affect public messaging.",
        artifact: "Launch timing update",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.roman",
    seatId: "seat.planck.hq.cmo.roman",
    bindingId: "binding.planck.hq.roman",
    displayName: "Roman",
    title: "Chief Marketing Officer",
    department: "Marketing",
    team: "Marketing",
    reportsTo: "employee.planck.mark",
    workflowLanes: ["lane.marketing"],
    skills: [
      "skill.campaign-planning",
      "skill.content-and-seo",
      "skill.changelog-distribution",
      "skill.pr-and-brand",
    ],
    tools: withBundle("marketingCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.brand-claims-human-approval",
    ],
    outputs: [
      "output.marketing.campaign-brief",
      "output.marketing.content-plan",
      "output.marketing.launch-brief",
    ],
    routines: [
      "routine.marketing.weekly-plan",
      "routine.marketing.performance-review",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.creative.arthur",
        trigger: "A campaign needs a creative brief or content direction.",
        artifact: "Creative brief",
      },
      {
        toSeatId: "seat.planck.hq.digital.daniel",
        trigger: "A campaign needs distribution planning or paid support.",
        artifact: "Channel plan",
      },
      {
        toSeatId: "seat.planck.hq.social.elisabeth",
        trigger: "Social distribution needs a content calendar or launch posts.",
        artifact: "Social calendar",
      },
      {
        toSeatId: "seat.planck.hq.brand.nadin",
        trigger: "Messaging needs brand review or PR coordination.",
        artifact: "Brand review note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.arthur",
    seatId: "seat.planck.hq.creative.arthur",
    bindingId: "binding.planck.hq.arthur",
    displayName: "Arthur",
    title: "Creative Director",
    department: "Marketing",
    team: "Marketing",
    reportsTo: "employee.planck.roman",
    workflowLanes: ["lane.marketing"],
    skills: ["skill.creative-direction", "skill.content-and-seo"],
    tools: [
      { toolId: "tool.docs", access: "execute_low_risk" },
      { toolId: "tool.cms", access: "execute_low_risk" },
      { toolId: "tool.analytics", access: "read" },
      { toolId: "tool.releases", access: "read" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.brand-claims-human-approval",
    ],
    outputs: [
      "output.creative.brief",
      "output.creative.landing-copy",
      "output.creative.content-draft",
    ],
    routines: ["routine.creative.weekly-review"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "Creative work is ready for campaign approval.",
        artifact: "Creative review",
      },
      {
        toSeatId: "seat.planck.hq.brand.nadin",
        trigger: "Messaging needs final brand alignment.",
        artifact: "Brand alignment note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.daniel",
    seatId: "seat.planck.hq.digital.daniel",
    bindingId: "binding.planck.hq.daniel",
    displayName: "Daniel",
    title: "Digital Marketer",
    department: "Marketing",
    team: "Marketing",
    reportsTo: "employee.planck.roman",
    workflowLanes: ["lane.marketing", "lane.revenue"],
    skills: [
      "skill.performance-marketing",
      "skill.content-and-seo",
      "skill.campaign-planning",
    ],
    tools: [
      { toolId: "tool.analytics", access: "read" },
      { toolId: "tool.ads", access: "execute_low_risk" },
      { toolId: "tool.cms", access: "execute_low_risk" },
      { toolId: "tool.email", access: "execute_low_risk" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.brand-claims-human-approval",
    ],
    outputs: [
      "output.digital.channel-plan",
      "output.digital.performance-report",
      "output.digital.ad-copy",
    ],
    routines: [
      "routine.digital.daily-channel-check",
      "routine.digital.weekly-optimization",
    ],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "Performance data suggests a strategy change.",
        artifact: "Performance recommendation",
      },
      {
        toSeatId: "seat.planck.hq.creative.arthur",
        trigger: "Campaign performance depends on new creative assets.",
        artifact: "Asset request",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.elisabeth",
    seatId: "seat.planck.hq.social.elisabeth",
    bindingId: "binding.planck.hq.elisabeth",
    displayName: "Elisabeth",
    title: "Social Media Manager",
    department: "Marketing",
    team: "Marketing",
    reportsTo: "employee.planck.roman",
    workflowLanes: ["lane.marketing"],
    skills: [
      "skill.social-distribution",
      "skill.content-and-seo",
      "skill.changelog-distribution",
    ],
    tools: [
      { toolId: "tool.social", access: "execute_low_risk" },
      { toolId: "tool.docs", access: "execute_low_risk" },
      { toolId: "tool.analytics", access: "read" },
      { toolId: "tool.releases", access: "read" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.brand-claims-human-approval",
    ],
    outputs: [
      "output.social.calendar",
      "output.social.post-draft",
      "output.social.engagement-summary",
    ],
    routines: ["routine.social.daily-pass", "routine.social.weekly-review"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "Social engagement suggests a campaign adjustment.",
        artifact: "Social engagement note",
      },
      {
        toSeatId: "seat.planck.hq.brand.nadin",
        trigger: "A post or response needs brand or PR review.",
        artifact: "Sensitive social draft",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.nadin",
    seatId: "seat.planck.hq.brand.nadin",
    bindingId: "binding.planck.hq.nadin",
    displayName: "Nadin",
    title: "PR and Brand Manager",
    department: "Marketing",
    team: "Marketing",
    reportsTo: "employee.planck.roman",
    workflowLanes: ["lane.marketing"],
    skills: ["skill.pr-and-brand", "skill.campaign-planning"],
    tools: [
      { toolId: "tool.docs", access: "execute_low_risk" },
      { toolId: "tool.email", access: "draft" },
      { toolId: "tool.social", access: "execute_low_risk" },
      { toolId: "tool.reporting", access: "read" },
    ],
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.external-comms-safe-write",
      "policy.brand-claims-human-approval",
      "policy.legal-review-required",
    ],
    outputs: [
      "output.brand.brief",
      "output.brand.pr-note",
      "output.brand.press-response-draft",
    ],
    routines: ["routine.brand.weekly-review", "routine.brand.pr-response"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cmo.roman",
        trigger: "Brand or PR work needs campaign-level strategy approval.",
        artifact: "Brand strategy note",
      },
      {
        toSeatId: "seat.planck.hq.legal.harvey",
        trigger: "A public claim or response needs legal review.",
        artifact: "Legal review request",
      },
      {
        toSeatId: "seat.planck.hq.assistant.kate",
        trigger: "Founder-sensitive communications need scheduling or prep.",
        artifact: "Founder comms note",
      },
    ],
  }),
  seat({
    pixelEmployeeId: "employee.planck.harvey",
    seatId: "seat.planck.hq.legal.harvey",
    bindingId: "binding.planck.hq.harvey",
    displayName: "Harvey",
    title: "Chief Legal Officer",
    department: "Legal",
    team: "Legal",
    reportsTo: "employee.planck.mark",
    workflowLanes: ["lane.legal", "lane.revenue", "lane.finance"],
    skills: ["skill.legal-review-and-compliance"],
    tools: withBundle("legalCore"),
    policies: [
      "policy.audit-trail-required",
      "policy.read-draft-propose",
      "policy.legal-review-required",
    ],
    outputs: [
      "output.legal.contract-redline-note",
      "output.legal.risk-memo",
      "output.legal.compliance-review",
    ],
    routines: ["routine.legal.weekly-review", "routine.legal.contract-check"],
    handoffs: [
      {
        toSeatId: "seat.planck.hq.cfo.felix",
        trigger: "Finance and legal risk overlap in a contract or obligation.",
        artifact: "Finance legal note",
      },
      {
        toSeatId: "seat.planck.hq.cro.george",
        trigger: "A deal needs contract review or redlines.",
        artifact: "Contract redline note",
      },
      {
        toSeatId: "seat.planck.hq.success.lara",
        trigger: "A customer dispute becomes legal-sensitive.",
        artifact: "Customer dispute review",
      },
      {
        toSeatId: "seat.planck.hq.brand.nadin",
        trigger: "A public claim or response creates legal exposure.",
        artifact: "Public claims review",
      },
    ],
  }),
];

export const PLANCK_HQ_BOT_SEAT_COUNT = PLANCK_HQ_BOT_SEATS.length;

const PLANCK_HQ_BOT_SEAT_BY_ID = new Map(
  PLANCK_HQ_BOT_SEATS.map((seat) => [seat.seatId, seat]),
);

export function getPlanckHqBotSeat(
  seatId: string,
): PlanckHqSeatDefinition | undefined {
  return PLANCK_HQ_BOT_SEAT_BY_ID.get(seatId);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildPlanckAgentSlug(seat: PlanckHqSeatDefinition): string {
  return seat.seatId.replace(/^seat\./, "").replace(/\./g, "-");
}

export function buildRuntimeLabel(seat: PlanckHqSeatDefinition): string {
  return `planck-hq-${slugify(seat.displayName)}`;
}

export function buildTelegramLink(username?: string | null): string | null {
  const normalized = username?.trim().replace(/^@/, "") || "";
  return normalized ? `https://t.me/${normalized}` : null;
}

export function buildAgentPurpose(seat: PlanckHqSeatDefinition): string {
  return `Operate as ${seat.title} for Planck HQ inside Meet Matt and Telegram.`;
}

export function buildAgentMetadata(
  seat: PlanckHqSeatDefinition,
  userId: string | null,
  workspaceId: string,
): Prisma.InputJsonValue {
  return {
    source: "planck-hq-bot-fleet",
    org: "Planck HQ",
    office: "Pixel HQ",
    controlPlane: "meet-matt",
    assignedUserId: userId,
    assignedWorkspaceId: workspaceId,
    seat: {
      pixelEmployeeId: seat.pixelEmployeeId,
      seatId: seat.seatId,
      bindingId: seat.bindingId,
      displayName: seat.displayName,
      title: seat.title,
      department: seat.department,
      team: seat.team,
      reportsTo: seat.reportsTo ?? null,
      sourceRoleTemplate: seat.sourceRoleTemplate ?? null,
      workflowLanes: seat.workflowLanes,
      skills: seat.skills,
      tools: seat.tools,
      policies: seat.policies,
      outputs: seat.outputs,
      routines: seat.routines,
      handoffs: seat.handoffs,
    },
  } as unknown as Prisma.InputJsonValue;
}

export function buildIdentityMetadata(
  seat: PlanckHqSeatDefinition,
  userId: string | null,
  workspaceId: string,
): Prisma.InputJsonValue {
  return {
    source: "planck-hq-bot-fleet",
    org: "Planck HQ",
    office: "Pixel HQ",
    assignedUserId: userId,
    assignedWorkspaceId: workspaceId,
    pixelEmployeeId: seat.pixelEmployeeId,
    seatId: seat.seatId,
    bindingId: seat.bindingId,
    workflowLanes: seat.workflowLanes,
    department: seat.department,
    team: seat.team,
  } as unknown as Prisma.InputJsonValue;
}

function normalizeCredentialMap(
  seatCredentials?: Record<string, PlanckSeatCredentialInput> | null,
): Map<string, PlanckSeatCredentialInput> {
  const normalized = new Map<string, PlanckSeatCredentialInput>();

  for (const [key, value] of Object.entries(seatCredentials ?? {})) {
    if (!key.trim() || !value || typeof value !== "object") {
      continue;
    }
    normalized.set(key.trim().toLowerCase(), value);
  }

  return normalized;
}

function resolveSeatCredentials(
  seat: PlanckHqSeatDefinition,
  normalizedCredentialMap: Map<string, PlanckSeatCredentialInput>,
): PlanckSeatCredentialInput | undefined {
  const candidates = [
    seat.seatId,
    seat.bindingId,
    seat.pixelEmployeeId,
    seat.displayName,
    slugify(seat.displayName),
  ];

  for (const candidate of candidates) {
    const match = normalizedCredentialMap.get(candidate.toLowerCase());
    if (match) {
      return match;
    }
  }

  return undefined;
}

function hasCredentials(credentials?: PlanckSeatCredentialInput): boolean {
  if (!credentials) {
    return false;
  }

  return Boolean(
    credentials.botToken?.trim() ||
      credentials.session?.trim() ||
      credentials.externalTelegramUsername?.trim() ||
      credentials.externalTelegramUserId?.trim(),
  );
}

async function resolveWorkspaceId(
  userId: string,
  workspaceId?: string | null,
): Promise<string> {
  const requestedWorkspaceId = workspaceId?.trim() || null;
  if (requestedWorkspaceId) {
    return (
      await resolveWorkspaceAccessForUser({
        userId,
        requestedWorkspaceId,
      })
    ).workspaceId;
  }

  return (await ensurePersonalWorkspaceForUser(userId)).workspaceId;
}

export type PlanckHqSeatAgentRecord = Prisma.AgentGetPayload<{
  include: {
    telegramIdentities: {
      include: {
        telegramIdentity: true;
      };
    };
  };
}>;

export async function upsertPlanckHqSeatAgent(params: {
  seat: PlanckHqSeatDefinition;
  userId?: string | null;
  workspaceId: string;
  displayName?: string | null;
  externalTelegramUsername?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ agent: PlanckHqSeatAgentRecord; created: boolean }> {
  const seat = params.seat;
  const userId = params.userId?.trim() || null;
  const displayName = params.displayName?.trim() || seat.displayName;
  const externalTelegramUsername =
    params.externalTelegramUsername?.trim().replace(/^@/, "") || null;
  const metadata =
    params.metadata ?? buildAgentMetadata(seat, userId, params.workspaceId);

  let agent = await prisma.agent.findUnique({
    where: { slug: buildPlanckAgentSlug(seat) },
    include: {
      telegramIdentities: {
        include: {
          telegramIdentity: true,
        },
      },
    },
  });

  if (!agent) {
    const createdAgent = await prisma.agent.create({
      data: {
        sessionId: `tele_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        slug: buildPlanckAgentSlug(seat),
        name: displayName,
        purpose: buildAgentPurpose(seat),
        features: seat.skills,
        tier: "planck-hq",
        status: "pending",
        userId,
        workspaceId: params.workspaceId,
        ownerType: OWNER_TYPE.customer,
        agentKind: AGENT_KIND.syntheticEmployee,
        productUseCase: "assistant",
        personalityPreset: "professional",
        transportProvider: TRANSPORT_PROVIDER.telethon,
        brainProvider: BRAIN_PROVIDER.cortex,
        deploymentProvider: BRAIN_PROVIDER.openclaw,
        cortexId: defaultCortexIdForAgentKind(AGENT_KIND.syntheticEmployee),
        activationStatus: "pending",
        deployState: "queued",
        botUsername: externalTelegramUsername,
        telegramLink: buildTelegramLink(externalTelegramUsername),
        metadata,
      },
      include: {
        telegramIdentities: {
          include: {
            telegramIdentity: true,
          },
        },
      },
    });

    try {
      await provisionAgentUseCaseBundle({
        agentId: createdAgent.id,
        useCaseTemplateSlug: USE_CASE_TEMPLATE_SLUG.syntheticEmployee,
      });
    } catch (error) {
      await prisma.agent
        .delete({
          where: { id: createdAgent.id },
        })
        .catch(() => undefined);
      throw error;
    }

    return {
      agent: createdAgent,
      created: true,
    };
  }

  agent = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      name: displayName,
      purpose: buildAgentPurpose(seat),
      features: seat.skills,
      userId,
      workspaceId: params.workspaceId,
      ownerType: OWNER_TYPE.customer,
      agentKind: AGENT_KIND.syntheticEmployee,
      productUseCase: "assistant",
      personalityPreset: "professional",
      transportProvider: TRANSPORT_PROVIDER.telethon,
      brainProvider: BRAIN_PROVIDER.cortex,
      deploymentProvider: BRAIN_PROVIDER.openclaw,
      cortexId: defaultCortexIdForAgentKind(AGENT_KIND.syntheticEmployee),
      botUsername: externalTelegramUsername || agent.botUsername,
      telegramLink:
        buildTelegramLink(externalTelegramUsername) || agent.telegramLink,
      metadata,
    },
    include: {
      telegramIdentities: {
        include: {
          telegramIdentity: true,
        },
      },
    },
  });

  return {
    agent,
    created: false,
  };
}

export async function provisionPlanckHqBotFleet(
  params: PlanckHqFleetProvisionParams,
): Promise<PlanckHqFleetProvisionResult> {
  const userId = params.userId.trim();
  if (!userId) {
    throw { status: 400, message: "userId is required" };
  }

  const workspaceId = await resolveWorkspaceId(userId, params.workspaceId);
  const normalizedCredentialMap = normalizeCredentialMap(params.seatCredentials);
  const ownershipType =
    params.identityOwnershipType ===
    TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
      ? TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
      : TELEGRAM_IDENTITY_OWNERSHIP.customerOwned;
  const defaultIdentityStatus =
    params.identityStatus &&
    Object.values(TELEGRAM_IDENTITY_STATUS).includes(
      params.identityStatus as (typeof TELEGRAM_IDENTITY_STATUS)[keyof typeof TELEGRAM_IDENTITY_STATUS],
    )
      ? params.identityStatus
      : TELEGRAM_IDENTITY_STATUS.pending;

  const seats: PlanckHqSeatProvisionResult[] = [];
  let createdAgents = 0;
  let createdIdentities = 0;
  let updatedIdentities = 0;

  for (const seat of PLANCK_HQ_BOT_SEATS) {
    const credentials = resolveSeatCredentials(seat, normalizedCredentialMap);
    const agentSlug = buildPlanckAgentSlug(seat);
    const runtimeLabel = credentials?.runtimeLabel?.trim() || buildRuntimeLabel(seat);
    const externalTelegramUsername =
      credentials?.externalTelegramUsername?.trim().replace(/^@/, "") || null;
    const displayName = credentials?.displayName?.trim() || seat.displayName;
    const agentMetadata = buildAgentMetadata(seat, userId, workspaceId);
    const identityMetadata = buildIdentityMetadata(seat, userId, workspaceId);

    let createdAgent = false;
    let createdIdentity = false;
    let updatedIdentity = false;

    const seatAgentResult = await upsertPlanckHqSeatAgent({
      seat,
      userId,
      workspaceId,
      displayName,
      externalTelegramUsername,
      metadata: agentMetadata,
    });

    const agent = seatAgentResult.agent;

    if (seatAgentResult.created) {
      createdAgent = true;
      createdAgents += 1;
    }

    const primaryIdentity =
      agent.telegramIdentities.find((link) => link.role === "primary")
        ?.telegramIdentity ?? agent.telegramIdentities[0]?.telegramIdentity;

    let identity = primaryIdentity;

    if (!identity) {
      identity = await provisionTelegramIdentity({
        kind: TELEGRAM_IDENTITY_KIND.bot,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        ownershipType,
        status: credentials?.status?.trim() || defaultIdentityStatus,
        userId,
        workspaceId,
        displayName,
        externalTelegramUserId:
          credentials?.externalTelegramUserId?.trim() || null,
        externalTelegramUsername,
        externalPhone: credentials?.externalPhone?.trim() || null,
        botToken: credentials?.botToken?.trim() || null,
        session: credentials?.session?.trim() || null,
        runtimeLabel,
        metadata: identityMetadata,
        links: [{ agentId: agent.id, role: "primary" }],
      });
      createdIdentity = true;
      createdIdentities += 1;
    } else {
      identity = await updateTelegramIdentityCredentials({
        telegramIdentityId: identity.id,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        displayName,
        status: credentials?.status?.trim() || undefined,
        externalTelegramUserId:
          credentials?.externalTelegramUserId?.trim() || undefined,
        externalTelegramUsername: externalTelegramUsername || undefined,
        externalPhone: credentials?.externalPhone?.trim() || undefined,
        botToken: credentials?.botToken?.trim() || undefined,
        session: credentials?.session?.trim() || undefined,
        runtimeLabel,
        metadata: identityMetadata,
      });
      updatedIdentity = true;
      updatedIdentities += 1;
    }

    if (externalTelegramUsername) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          botUsername: externalTelegramUsername,
          telegramLink: buildTelegramLink(externalTelegramUsername),
        },
      });
    }

    seats.push({
      seatId: seat.seatId,
      displayName,
      title: seat.title,
      agentId: agent.id,
      agentSlug,
      telegramIdentityId: identity.id,
      createdAgent,
      createdIdentity,
      updatedIdentity,
      hasCredentials: hasCredentials(credentials),
      externalTelegramUsername:
        identity.externalTelegramUsername || externalTelegramUsername,
      runtimeLabel: identity.runtimeLabel || runtimeLabel,
    });
  }

  return {
    userId,
    workspaceId,
    totalSeats: PLANCK_HQ_BOT_SEATS.length,
    createdAgents,
    createdIdentities,
    updatedIdentities,
    seats,
  };
}
