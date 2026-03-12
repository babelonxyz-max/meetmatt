import { Prisma } from "@prisma/client";
import {
  AgentKind,
  CatalogItemType,
  CatalogScopeType,
  CatalogTrustTier,
  EntitlementGrantType,
  EntitlementResetPolicy,
  SkillCapabilityType,
  SkillExecutionMode,
  SkillImplementationProviderKind,
  SkillQualityTier,
  SkillRuntimeEngine,
  UseCaseTemplateItemInclusionType,
  UseCaseTemplateProvisioningMode,
  WorkerTier,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonValue = Prisma.InputJsonValue;

type BuiltInFallbackPolicy = {
  slug: string;
  name: string;
  description?: string;
  steps: JsonValue;
};

type BuiltInSkillImplementation = {
  implementationKey: string;
  providerKind: SkillImplementationProviderKind;
  qualityTier: SkillQualityTier;
  runtimeEngine: SkillRuntimeEngine;
  availabilityStatus?: string;
  requiresEntitlement?: boolean;
  requiresApproval?: boolean;
  timeoutMs?: number;
  idempotencyMode?: string;
  priority?: number;
  metadata?: JsonValue;
  costModel?: JsonValue;
};

type BuiltInSkillDefinition = {
  slug: string;
  name: string;
  description?: string;
  capabilityType: SkillCapabilityType;
  executionMode: SkillExecutionMode;
  policySpec?: JsonValue;
  fallbackPolicySlug?: string;
  implementations: BuiltInSkillImplementation[];
};

type BuiltInCatalogItem = {
  slug: string;
  name: string;
  description?: string;
  itemType: CatalogItemType;
  scopeType: CatalogScopeType;
  status?: string;
  origin?: string;
  trustTier?: CatalogTrustTier;
  displayMeta?: JsonValue;
  pricingMeta?: JsonValue;
  skills?: Array<{
    skillSlug: string;
    role?: string;
    required?: boolean;
    displayOrder?: number;
  }>;
  entitlements?: Array<{
    entitlementPackSlug: string;
    grantOnAttach?: boolean;
    displayOrder?: number;
  }>;
};

type BuiltInEntitlementPack = {
  slug: string;
  name: string;
  description?: string;
  scopeType: CatalogScopeType;
  grantType: EntitlementGrantType;
  resetPolicy: EntitlementResetPolicy;
  durationSpec?: JsonValue;
  pricingSpec?: JsonValue;
  autoTopupEligible?: boolean;
  status?: string;
  fallbackPolicySlug?: string;
  allowances: Array<{
    skillSlug: string;
    meterKey: string;
    includedUnits?: number | null;
    softLimit?: number | null;
    hardLimit?: number | null;
  }>;
};

type BuiltInUseCaseTemplate = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  agentKind: AgentKind;
  defaultExecutionMode: SkillExecutionMode;
  defaultWorkerTier?: WorkerTier;
  defaultTransportPolicy?: JsonValue;
  defaultBrainPolicy?: JsonValue;
  templateSpec?: JsonValue;
  promptSpec?: JsonValue;
  guardrailSpec?: JsonValue;
  scheduleSpec?: JsonValue;
  memorySpec?: JsonValue;
  approvalSpec?: JsonValue;
  status?: string;
  items: Array<{
    catalogItemSlug: string;
    inclusionType: UseCaseTemplateItemInclusionType;
    defaultEnabled?: boolean;
    displayOrder?: number;
  }>;
  entitlements: Array<{
    entitlementPackSlug: string;
    provisioningMode: UseCaseTemplateProvisioningMode;
    displayOrder?: number;
  }>;
};

const json = (value: unknown): JsonValue => value as JsonValue;

export const USE_CASE_TEMPLATE_SLUG = {
  customerAssistant: "customer-assistant-core",
  customerFleet: "customer-fleet-core",
  syntheticEmployee: "synthetic-employee-core",
  mattSupport: "matt-support-core",
  mattAccountManager: "matt-account-manager-core",
  mattOps: "matt-ops-core",
  coderSpecialist: "coder-specialist",
} as const;

const FALLBACK_POLICIES: BuiltInFallbackPolicy[] = [
  {
    slug: "premium-cheap-free",
    name: "Premium to Cheap to Free",
    description: "Use premium first, then cheap, then free implementations.",
    steps: json([
      { qualityTier: "premium", disclosureMode: "included_or_paid" },
      { qualityTier: "cheap", disclosureMode: "explicit" },
      { qualityTier: "free", disclosureMode: "explicit" },
    ]),
  },
  {
    slug: "premium-free",
    name: "Premium to Free",
    description: "Use premium first, otherwise fall back to free mode.",
    steps: json([
      { qualityTier: "premium", disclosureMode: "included_or_paid" },
      { qualityTier: "free", disclosureMode: "explicit" },
    ]),
  },
  {
    slug: "specialist-premium-cheap",
    name: "Specialist Premium to Cheap",
    description: "Prefer premium specialist execution, then cheaper expert fallback.",
    steps: json([
      { qualityTier: "premium", disclosureMode: "included_or_paid" },
      { qualityTier: "cheap", disclosureMode: "explicit" },
    ]),
  },
];

const SKILLS: BuiltInSkillDefinition[] = [
  {
    slug: "conversation_core",
    name: "Conversation Core",
    description: "Primary conversational reasoning and response generation.",
    capabilityType: SkillCapabilityType.communication,
    executionMode: SkillExecutionMode.interactive,
    policySpec: json({ class: "conversation", customerVisible: true }),
    fallbackPolicySlug: "premium-cheap-free",
    implementations: [
      {
        implementationKey: "cortex-conversation-premium",
        providerKind: SkillImplementationProviderKind.api,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.interactive,
        priority: 100,
        metadata: json({ provider: "cortex", cortexId: "matt-consumer" }),
      },
      {
        implementationKey: "openclaw-conversation-cheap",
        providerKind: SkillImplementationProviderKind.openclaw_fork,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.interactive,
        priority: 50,
        metadata: json({ provider: "openclaw", mode: "interactive" }),
      },
    ],
  },
  {
    slug: "knowledge_lookup",
    name: "Knowledge Lookup",
    description: "Knowledge-base or FAQ retrieval for support-style roles.",
    capabilityType: SkillCapabilityType.search,
    executionMode: SkillExecutionMode.interactive,
    policySpec: json({ class: "retrieval" }),
    fallbackPolicySlug: "premium-free",
    implementations: [
      {
        implementationKey: "native-knowledge-lookup-free",
        providerKind: SkillImplementationProviderKind.native,
        qualityTier: SkillQualityTier.free,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 10,
        metadata: json({ provider: "native", source: "knowledge-base" }),
      },
    ],
  },
  {
    slug: "ticket_triage",
    name: "Ticket Triage",
    description: "Categorize and route support requests.",
    capabilityType: SkillCapabilityType.workflow,
    executionMode: SkillExecutionMode.interactive,
    policySpec: json({ class: "support", escalationRequired: false }),
    implementations: [
      {
        implementationKey: "native-ticket-triage",
        providerKind: SkillImplementationProviderKind.native,
        qualityTier: SkillQualityTier.free,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 10,
      },
    ],
  },
  {
    slug: "research_query",
    name: "Research Query",
    description: "Targeted research and analysis using premium and fallback paths.",
    capabilityType: SkillCapabilityType.search,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "research", metered: true }),
    fallbackPolicySlug: "premium-cheap-free",
    implementations: [
      {
        implementationKey: "cortex-research-premium",
        providerKind: SkillImplementationProviderKind.api,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.autonomous,
        requiresEntitlement: true,
        priority: 100,
        metadata: json({ provider: "cortex", cortexId: "matt-consumer" }),
      },
      {
        implementationKey: "openfang-research-cheap",
        providerKind: SkillImplementationProviderKind.openfang_fork,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.autonomous,
        priority: 50,
        metadata: json({ provider: "openfang", mode: "research" }),
      },
      {
        implementationKey: "native-research-free",
        providerKind: SkillImplementationProviderKind.native,
        qualityTier: SkillQualityTier.free,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 10,
      },
    ],
  },
  {
    slug: "scheduled_summary",
    name: "Scheduled Summary",
    description: "Recurring digest and reporting workflow.",
    capabilityType: SkillCapabilityType.workflow,
    executionMode: SkillExecutionMode.autonomous,
    policySpec: json({ class: "summary", scheduled: true }),
    implementations: [
      {
        implementationKey: "openfang-scheduled-summary",
        providerKind: SkillImplementationProviderKind.openfang_fork,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.autonomous,
        priority: 40,
      },
    ],
  },
  {
    slug: "image_generation",
    name: "Image Generation",
    description: "Creative image generation with premium and free fallbacks.",
    capabilityType: SkillCapabilityType.generation,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "creative", metered: true }),
    fallbackPolicySlug: "premium-free",
    implementations: [
      {
        implementationKey: "premium-painter-v1",
        providerKind: SkillImplementationProviderKind.api,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.native,
        requiresEntitlement: true,
        priority: 100,
        metadata: json({ provider: "premium-image", mode: "high-quality" }),
      },
      {
        implementationKey: "nano-banana-free",
        providerKind: SkillImplementationProviderKind.api,
        qualityTier: SkillQualityTier.free,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 10,
        metadata: json({ provider: "nano-banana", mode: "free-limited" }),
      },
    ],
  },
  {
    slug: "competitor_monitoring",
    name: "Competitor Monitoring",
    description: "Recurring market and competitor watch workflows.",
    capabilityType: SkillCapabilityType.monitoring,
    executionMode: SkillExecutionMode.autonomous,
    policySpec: json({ class: "monitoring" }),
    implementations: [
      {
        implementationKey: "openfang-competitor-watch",
        providerKind: SkillImplementationProviderKind.openfang_fork,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.autonomous,
        priority: 40,
      },
    ],
  },
  {
    slug: "crm_write",
    name: "CRM Write",
    description: "Write customer and ops updates back to Planck/CRM systems.",
    capabilityType: SkillCapabilityType.connector_action,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "connector", approvalTier: "user_or_internal" }),
    fallbackPolicySlug: "premium-free",
    implementations: [
      {
        implementationKey: "planck-crm-write",
        providerKind: SkillImplementationProviderKind.tool_adapter,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.native,
        requiresEntitlement: true,
        requiresApproval: true,
        priority: 100,
        metadata: json({ provider: "planck", scope: "write" }),
      },
    ],
  },
  {
    slug: "workspace_tool_action",
    name: "Workspace Tool Action",
    description: "Execute workspace connector actions through Composio with Sesh fallback.",
    capabilityType: SkillCapabilityType.connector_action,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "connector", approvalTier: "user_or_internal", provider: "composio_primary" }),
    fallbackPolicySlug: "premium-free",
    implementations: [
      {
        implementationKey: "composio-workspace-tool-action",
        providerKind: SkillImplementationProviderKind.tool_adapter,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.native,
        requiresEntitlement: true,
        requiresApproval: true,
        priority: 110,
        metadata: json({ provider: "composio", fallbackProvider: "sesh" }),
      },
    ],
  },
  {
    slug: "voice_reply",
    name: "Voice Reply",
    description: "Voice or audio response generation.",
    capabilityType: SkillCapabilityType.communication,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "voice" }),
    implementations: [
      {
        implementationKey: "native-voice-basic",
        providerKind: SkillImplementationProviderKind.native,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 20,
      },
    ],
  },
  {
    slug: "lead_enrichment",
    name: "Lead Enrichment",
    description: "Enrich lead and prospect records with premium data sources.",
    capabilityType: SkillCapabilityType.search,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "lead-enrichment", metered: true }),
    fallbackPolicySlug: "premium-cheap-free",
    implementations: [
      {
        implementationKey: "lead-enrichment-premium",
        providerKind: SkillImplementationProviderKind.api,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.native,
        requiresEntitlement: true,
        priority: 100,
      },
      {
        implementationKey: "lead-enrichment-cheap",
        providerKind: SkillImplementationProviderKind.native,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.native,
        priority: 30,
      },
    ],
  },
  {
    slug: "code_execution",
    name: "Code Execution",
    description: "Premium coding and debugging specialist path.",
    capabilityType: SkillCapabilityType.workflow,
    executionMode: SkillExecutionMode.hybrid,
    policySpec: json({ class: "coder", metered: true, approvalTier: "internal" }),
    fallbackPolicySlug: "specialist-premium-cheap",
    implementations: [
      {
        implementationKey: "openclaw-coder-premium",
        providerKind: SkillImplementationProviderKind.openclaw_fork,
        qualityTier: SkillQualityTier.premium,
        runtimeEngine: SkillRuntimeEngine.interactive,
        requiresEntitlement: true,
        priority: 100,
      },
      {
        implementationKey: "openfang-coder-cheap",
        providerKind: SkillImplementationProviderKind.openfang_fork,
        qualityTier: SkillQualityTier.cheap,
        runtimeEngine: SkillRuntimeEngine.autonomous,
        priority: 50,
      },
    ],
  },
];

const CATALOG_ITEMS: BuiltInCatalogItem[] = [
  {
    slug: "conversation-core",
    name: "Conversation Core",
    description: "Baseline conversational ability for customer-facing agents.",
    itemType: CatalogItemType.skill,
    scopeType: CatalogScopeType.agent,
    displayMeta: json({ includedLabel: "Core" }),
    skills: [{ skillSlug: "conversation_core" }],
  },
  {
    slug: "support-kit",
    name: "Support Kit",
    description: "Knowledge lookup and support triage bundle.",
    itemType: CatalogItemType.workflow_pack,
    scopeType: CatalogScopeType.agent,
    displayMeta: json({ includedLabel: "Support" }),
    skills: [
      { skillSlug: "knowledge_lookup", displayOrder: 10 },
      { skillSlug: "ticket_triage", displayOrder: 20 },
    ],
  },
  {
    slug: "researcher",
    name: "Researcher",
    description: "Research and recurring summary capability bundle.",
    itemType: CatalogItemType.skill,
    scopeType: CatalogScopeType.agent,
    displayMeta: json({ includedLabel: "Research" }),
    skills: [
      { skillSlug: "research_query", displayOrder: 10 },
      { skillSlug: "scheduled_summary", displayOrder: 20 },
    ],
  },
  {
    slug: "research-pro",
    name: "Research Pro",
    description: "Premium research allowance pack for deeper analysis.",
    itemType: CatalogItemType.usage_pack,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 29, unit: "pack" }),
    skills: [],
    entitlements: [{ entitlementPackSlug: "research-pro-500" }],
  },
  {
    slug: "painter",
    name: "Painter",
    description: "Creative image generation capability with premium allowance.",
    itemType: CatalogItemType.skill,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 19, unit: "pack" }),
    skills: [{ skillSlug: "image_generation" }],
    entitlements: [{ entitlementPackSlug: "painter-pack-100" }],
  },
  {
    slug: "competitor-watch",
    name: "Competitor Watch",
    description: "Ongoing competitor and market monitoring.",
    itemType: CatalogItemType.workflow_pack,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 15, unit: "month" }),
    skills: [{ skillSlug: "competitor_monitoring" }],
  },
  {
    slug: "crm-sync",
    name: "CRM Sync",
    description: "Connector access for writing customer and ops updates.",
    itemType: CatalogItemType.connector,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 39, unit: "pack" }),
    skills: [{ skillSlug: "crm_write" }],
    entitlements: [{ entitlementPackSlug: "crm-write-pack-500" }],
  },
  {
    slug: "composio-connectors",
    name: "Composio Connectors",
    description: "Workspace tool and SaaS connector access with Sesh fallback.",
    itemType: CatalogItemType.connector,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 49, unit: "month" }),
    skills: [{ skillSlug: "workspace_tool_action" }],
    entitlements: [{ entitlementPackSlug: "workspace-tool-actions-1000" }],
  },
  {
    slug: "whatsapp-channel",
    name: "WhatsApp Channel",
    description: "WhatsApp customer messaging channel with Sesh-managed transport fallback.",
    itemType: CatalogItemType.channel_upgrade,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 19, unit: "month" }),
    displayMeta: json({ channel: "whatsapp", transport: "sesh_fallback" }),
    skills: [],
  },
  {
    slug: "voice-mode",
    name: "Voice Mode",
    description: "Voice and audio reply capability.",
    itemType: CatalogItemType.channel_upgrade,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 12, unit: "month" }),
    skills: [{ skillSlug: "voice_reply" }],
  },
  {
    slug: "lead-enrichment",
    name: "Lead Enrichment",
    description: "Premium prospect and lead enrichment.",
    itemType: CatalogItemType.skill,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 24, unit: "pack" }),
    skills: [{ skillSlug: "lead_enrichment" }],
    entitlements: [{ entitlementPackSlug: "lead-enrichment-pack-250" }],
  },
  {
    slug: "coder-specialist",
    name: "Coder Specialist",
    description: "Premium coding and debugging specialist capability.",
    itemType: CatalogItemType.workflow_pack,
    scopeType: CatalogScopeType.agent,
    pricingMeta: json({ usd: 79, unit: "pack" }),
    skills: [{ skillSlug: "code_execution" }],
    entitlements: [{ entitlementPackSlug: "coder-pack-100" }],
  },
];

const ENTITLEMENT_PACKS: BuiltInEntitlementPack[] = [
  {
    slug: "research-starter-50",
    name: "Research Starter (50 Queries)",
    description: "Starter monthly research allowance for bundled agents.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.included,
    resetPolicy: EntitlementResetPolicy.billing_cycle,
    autoTopupEligible: true,
    pricingSpec: json({ included: true }),
    allowances: [
      {
        skillSlug: "research_query",
        meterKey: "premium_queries",
        includedUnits: 50,
        softLimit: 40,
        hardLimit: 50,
      },
    ],
  },
  {
    slug: "research-pro-500",
    name: "Research Pro (500 Queries)",
    description: "Premium research pack for deeper analysis.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.consumable_topup,
    resetPolicy: EntitlementResetPolicy.purchase_period,
    durationSpec: json({ days: 30 }),
    pricingSpec: json({ usd: 29 }),
    autoTopupEligible: true,
    allowances: [
      {
        skillSlug: "research_query",
        meterKey: "premium_queries",
        includedUnits: 500,
        softLimit: 400,
        hardLimit: 500,
      },
    ],
  },
  {
    slug: "painter-starter-25",
    name: "Painter Starter (25 Generations)",
    description: "Starter monthly painter allowance.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.included,
    resetPolicy: EntitlementResetPolicy.billing_cycle,
    autoTopupEligible: true,
    pricingSpec: json({ included: true }),
    allowances: [
      {
        skillSlug: "image_generation",
        meterKey: "premium_generations",
        includedUnits: 25,
        softLimit: 20,
        hardLimit: 25,
      },
    ],
  },
  {
    slug: "painter-pack-100",
    name: "Painter Pack (100 Generations)",
    description: "Premium painter generation pack.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.consumable_topup,
    resetPolicy: EntitlementResetPolicy.purchase_period,
    durationSpec: json({ days: 30 }),
    pricingSpec: json({ usd: 19 }),
    autoTopupEligible: true,
    allowances: [
      {
        skillSlug: "image_generation",
        meterKey: "premium_generations",
        includedUnits: 100,
        softLimit: 80,
        hardLimit: 100,
      },
    ],
  },
  {
    slug: "crm-write-pack-500",
    name: "CRM Write Pack (500 Actions)",
    description: "Pack for Planck/CRM write actions.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.subscription,
    resetPolicy: EntitlementResetPolicy.billing_cycle,
    pricingSpec: json({ usd: 39 }),
    allowances: [
      {
        skillSlug: "crm_write",
        meterKey: "crm_actions",
        includedUnits: 500,
        softLimit: 400,
        hardLimit: 500,
      },
    ],
  },
  {
    slug: "workspace-tool-actions-1000",
    name: "Workspace Connector Pack (1000 Actions)",
    description: "Connector actions routed through Composio with Sesh fallback.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.subscription,
    resetPolicy: EntitlementResetPolicy.billing_cycle,
    pricingSpec: json({ usd: 49 }),
    allowances: [
      {
        skillSlug: "workspace_tool_action",
        meterKey: "workspace_tool_actions",
        includedUnits: 1000,
        softLimit: 800,
        hardLimit: 1000,
      },
    ],
  },
  {
    slug: "lead-enrichment-pack-250",
    name: "Lead Enrichment Pack (250 Records)",
    description: "Premium lead enrichment allowance.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.consumable_topup,
    resetPolicy: EntitlementResetPolicy.purchase_period,
    durationSpec: json({ days: 30 }),
    pricingSpec: json({ usd: 24 }),
    autoTopupEligible: true,
    allowances: [
      {
        skillSlug: "lead_enrichment",
        meterKey: "enriched_records",
        includedUnits: 250,
        softLimit: 200,
        hardLimit: 250,
      },
    ],
  },
  {
    slug: "coder-pack-100",
    name: "Coder Pack (100 Runs)",
    description: "Premium coding specialist allowance.",
    scopeType: CatalogScopeType.agent,
    grantType: EntitlementGrantType.consumable_topup,
    resetPolicy: EntitlementResetPolicy.purchase_period,
    durationSpec: json({ days: 30 }),
    pricingSpec: json({ usd: 79 }),
    autoTopupEligible: false,
    allowances: [
      {
        skillSlug: "code_execution",
        meterKey: "coding_runs",
        includedUnits: 100,
        softLimit: 80,
        hardLimit: 100,
      },
    ],
  },
];

const USE_CASE_TEMPLATES: BuiltInUseCaseTemplate[] = [
  {
    slug: USE_CASE_TEMPLATE_SLUG.customerAssistant,
    name: "Customer Assistant Core",
    description: "Base reactive assistant bundle for customer-facing deployments.",
    category: "assistant",
    agentKind: AgentKind.customer_agent,
    defaultExecutionMode: SkillExecutionMode.interactive,
    defaultWorkerTier: WorkerTier.standard,
    defaultTransportPolicy: json({ default: "telegram_bot_api" }),
    defaultBrainPolicy: json({ default: "devin", runtime: "devin" }),
    templateSpec: json({ heroUseCase: "assistant" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "support-kit", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "researcher", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 30 },
      { catalogItemSlug: "research-pro", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 40 },
      { catalogItemSlug: "painter", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 50 },
      { catalogItemSlug: "whatsapp-channel", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 60 },
      { catalogItemSlug: "voice-mode", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 70 },
    ],
    entitlements: [],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.customerFleet,
    name: "Customer Fleet Core",
    description: "Hybrid bundle for customer assistants with ongoing workflows.",
    category: "fleet",
    agentKind: AgentKind.customer_agent,
    defaultExecutionMode: SkillExecutionMode.hybrid,
    defaultWorkerTier: WorkerTier.standard,
    defaultTransportPolicy: json({ default: "telegram_bot_api" }),
    defaultBrainPolicy: json({ default: "openclaw", runtime: "openclaw" }),
    templateSpec: json({ heroUseCase: "fleet" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "researcher", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "research-pro", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 30 },
      { catalogItemSlug: "competitor-watch", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 40 },
      { catalogItemSlug: "lead-enrichment", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 50 },
      { catalogItemSlug: "whatsapp-channel", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 60 },
      { catalogItemSlug: "voice-mode", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 70 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "research-starter-50",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_activate,
        displayOrder: 10,
      },
    ],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.syntheticEmployee,
    name: "Synthetic Employee Core",
    description: "Hybrid proactive employee-style bundle for persistent worker agents.",
    category: "synthetic_employee",
    agentKind: AgentKind.synthetic_employee,
    defaultExecutionMode: SkillExecutionMode.hybrid,
    defaultWorkerTier: WorkerTier.premium,
    defaultTransportPolicy: json({ default: "telethon" }),
    defaultBrainPolicy: json({ default: "cortex", runtime: "openclaw" }),
    templateSpec: json({ heroUseCase: "synthetic_employee" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "researcher", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "research-pro", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 30 },
      { catalogItemSlug: "lead-enrichment", inclusionType: UseCaseTemplateItemInclusionType.optional_addon, displayOrder: 40 },
      { catalogItemSlug: "voice-mode", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 50 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "research-starter-50",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_activate,
        displayOrder: 10,
      },
    ],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.mattSupport,
    name: "Matt Support Core",
    description: "Internal Matt support bundle for customer help and triage.",
    category: "internal_support",
    agentKind: AgentKind.matt_support,
    defaultExecutionMode: SkillExecutionMode.interactive,
    defaultWorkerTier: WorkerTier.standard,
    defaultTransportPolicy: json({ default: "telethon" }),
    defaultBrainPolicy: json({ default: "cortex", runtime: "openclaw" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "support-kit", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "crm-sync", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 30 },
      { catalogItemSlug: "composio-connectors", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 40 },
      { catalogItemSlug: "whatsapp-channel", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 50 },
      { catalogItemSlug: "voice-mode", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 60 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "crm-write-pack-500",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 10,
      },
      {
        entitlementPackSlug: "workspace-tool-actions-1000",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 20,
      },
    ],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.mattAccountManager,
    name: "Matt Account Manager Core",
    description: "Internal Matt relationship and account-management bundle.",
    category: "internal_account_management",
    agentKind: AgentKind.matt_account_manager,
    defaultExecutionMode: SkillExecutionMode.hybrid,
    defaultWorkerTier: WorkerTier.premium,
    defaultTransportPolicy: json({ default: "telethon" }),
    defaultBrainPolicy: json({ default: "cortex", runtime: "openclaw" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "researcher", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "crm-sync", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 30 },
      { catalogItemSlug: "composio-connectors", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 40 },
      { catalogItemSlug: "whatsapp-channel", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 50 },
      { catalogItemSlug: "research-pro", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 60 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "research-starter-50",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 10,
      },
      {
        entitlementPackSlug: "crm-write-pack-500",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 20,
      },
      {
        entitlementPackSlug: "workspace-tool-actions-1000",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 30,
      },
    ],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.mattOps,
    name: "Matt Ops Core",
    description: "Internal operations bundle for supervision, monitoring, and backoffice work.",
    category: "internal_ops",
    agentKind: AgentKind.internal_ops,
    defaultExecutionMode: SkillExecutionMode.hybrid,
    defaultWorkerTier: WorkerTier.premium,
    defaultTransportPolicy: json({ default: "web" }),
    defaultBrainPolicy: json({ default: "openclaw", runtime: "openclaw" }),
    items: [
      { catalogItemSlug: "researcher", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "crm-sync", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
      { catalogItemSlug: "composio-connectors", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 30 },
      { catalogItemSlug: "competitor-watch", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 40 },
      { catalogItemSlug: "lead-enrichment", inclusionType: UseCaseTemplateItemInclusionType.recommended, displayOrder: 50 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "research-starter-50",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 10,
      },
      {
        entitlementPackSlug: "crm-write-pack-500",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 20,
      },
      {
        entitlementPackSlug: "workspace-tool-actions-1000",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_create,
        displayOrder: 30,
      },
    ],
  },
  {
    slug: USE_CASE_TEMPLATE_SLUG.coderSpecialist,
    name: "Coder Specialist",
    description: "Premium specialist worker for coding-heavy tasks and debugging.",
    category: "specialist",
    agentKind: AgentKind.synthetic_employee,
    defaultExecutionMode: SkillExecutionMode.hybrid,
    defaultWorkerTier: WorkerTier.specialist_coder,
    defaultTransportPolicy: json({ default: "web" }),
    defaultBrainPolicy: json({ default: "cortex", runtime: "openclaw" }),
    items: [
      { catalogItemSlug: "conversation-core", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 10 },
      { catalogItemSlug: "coder-specialist", inclusionType: UseCaseTemplateItemInclusionType.included, displayOrder: 20 },
    ],
    entitlements: [
      {
        entitlementPackSlug: "coder-pack-100",
        provisioningMode: UseCaseTemplateProvisioningMode.grant_on_activate,
        displayOrder: 10,
      },
    ],
  },
];

let syncPromise: Promise<void> | null = null;
let lastSuccessfulSyncAt = 0;
const SYNC_TTL_MS = 5 * 60 * 1000;

async function doSyncCapabilityCommerceCatalog(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const policy of FALLBACK_POLICIES) {
      await tx.fallbackPolicy.upsert({
        where: { slug: policy.slug },
        update: {
          name: policy.name,
          description: policy.description,
          steps: policy.steps,
        },
        create: {
          slug: policy.slug,
          name: policy.name,
          description: policy.description,
          steps: policy.steps,
        },
      });
    }

    const fallbackPolicies = await tx.fallbackPolicy.findMany({
      where: { slug: { in: FALLBACK_POLICIES.map((policy) => policy.slug) } },
    });
    const fallbackPolicyBySlug = new Map(
      fallbackPolicies.map((policy) => [policy.slug, policy]),
    );

    for (const skill of SKILLS) {
      await tx.skillDefinition.upsert({
        where: { slug: skill.slug },
        update: {
          name: skill.name,
          description: skill.description,
          capabilityType: skill.capabilityType,
          executionMode: skill.executionMode,
          policySpec: skill.policySpec,
          status: "active",
          fallbackPolicyId: skill.fallbackPolicySlug
            ? fallbackPolicyBySlug.get(skill.fallbackPolicySlug)?.id ?? null
            : null,
        },
        create: {
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          capabilityType: skill.capabilityType,
          executionMode: skill.executionMode,
          policySpec: skill.policySpec,
          status: "active",
          fallbackPolicyId: skill.fallbackPolicySlug
            ? fallbackPolicyBySlug.get(skill.fallbackPolicySlug)?.id ?? null
            : null,
        },
      });
    }

    const skillDefinitions = await tx.skillDefinition.findMany({
      where: { slug: { in: SKILLS.map((skill) => skill.slug) } },
    });
    const skillBySlug = new Map(skillDefinitions.map((skill) => [skill.slug, skill]));

    for (const skill of SKILLS) {
      const skillDefinition = skillBySlug.get(skill.slug);
      if (!skillDefinition) {
        continue;
      }

      for (const implementation of skill.implementations) {
        await tx.skillImplementation.upsert({
          where: { implementationKey: implementation.implementationKey },
          update: {
            providerKind: implementation.providerKind,
            qualityTier: implementation.qualityTier,
            runtimeEngine: implementation.runtimeEngine,
            availabilityStatus: implementation.availabilityStatus ?? "active",
            requiresEntitlement: implementation.requiresEntitlement ?? false,
            requiresApproval: implementation.requiresApproval ?? false,
            timeoutMs: implementation.timeoutMs ?? 30000,
            idempotencyMode: implementation.idempotencyMode ?? "best_effort",
            priority: implementation.priority ?? 0,
            metadata: implementation.metadata,
            costModel: implementation.costModel,
            skillDefinitionId: skillDefinition.id,
          },
          create: {
            implementationKey: implementation.implementationKey,
            providerKind: implementation.providerKind,
            qualityTier: implementation.qualityTier,
            runtimeEngine: implementation.runtimeEngine,
            availabilityStatus: implementation.availabilityStatus ?? "active",
            requiresEntitlement: implementation.requiresEntitlement ?? false,
            requiresApproval: implementation.requiresApproval ?? false,
            timeoutMs: implementation.timeoutMs ?? 30000,
            idempotencyMode: implementation.idempotencyMode ?? "best_effort",
            priority: implementation.priority ?? 0,
            metadata: implementation.metadata,
            costModel: implementation.costModel,
            skillDefinitionId: skillDefinition.id,
          },
        });
      }
    }

    for (const item of CATALOG_ITEMS) {
      await tx.catalogItem.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          scopeType: item.scopeType,
          status: item.status ?? "active",
          displayMeta: item.displayMeta,
          pricingMeta: item.pricingMeta,
          origin: item.origin ?? "matt_native",
          trustTier: item.trustTier ?? CatalogTrustTier.first_party,
        },
        create: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          scopeType: item.scopeType,
          status: item.status ?? "active",
          displayMeta: item.displayMeta,
          pricingMeta: item.pricingMeta,
          origin: item.origin ?? "matt_native",
          trustTier: item.trustTier ?? CatalogTrustTier.first_party,
        },
      });
    }

    const catalogItems = await tx.catalogItem.findMany({
      where: { slug: { in: CATALOG_ITEMS.map((item) => item.slug) } },
    });
    const catalogItemBySlug = new Map(catalogItems.map((item) => [item.slug, item]));

    for (const item of CATALOG_ITEMS) {
      const catalogItem = catalogItemBySlug.get(item.slug);
      if (!catalogItem) {
        continue;
      }

      for (const link of item.skills ?? []) {
        const skillDefinition = skillBySlug.get(link.skillSlug);
        if (!skillDefinition) {
          continue;
        }

        await tx.catalogItemSkill.upsert({
          where: {
            catalogItemId_skillDefinitionId: {
              catalogItemId: catalogItem.id,
              skillDefinitionId: skillDefinition.id,
            },
          },
          update: {
            role: link.role ?? "primary",
            required: link.required ?? true,
            displayOrder: link.displayOrder ?? 0,
          },
          create: {
            catalogItemId: catalogItem.id,
            skillDefinitionId: skillDefinition.id,
            role: link.role ?? "primary",
            required: link.required ?? true,
            displayOrder: link.displayOrder ?? 0,
          },
        });
      }
    }

    for (const pack of ENTITLEMENT_PACKS) {
      await tx.entitlementPack.upsert({
        where: { slug: pack.slug },
        update: {
          name: pack.name,
          description: pack.description,
          scopeType: pack.scopeType,
          grantType: pack.grantType,
          resetPolicy: pack.resetPolicy,
          durationSpec: pack.durationSpec,
          pricingSpec: pack.pricingSpec,
          autoTopupEligible: pack.autoTopupEligible ?? false,
          fallbackPolicyId: pack.fallbackPolicySlug
            ? fallbackPolicyBySlug.get(pack.fallbackPolicySlug)?.id ?? null
            : null,
          status: pack.status ?? "active",
        },
        create: {
          slug: pack.slug,
          name: pack.name,
          description: pack.description,
          scopeType: pack.scopeType,
          grantType: pack.grantType,
          resetPolicy: pack.resetPolicy,
          durationSpec: pack.durationSpec,
          pricingSpec: pack.pricingSpec,
          autoTopupEligible: pack.autoTopupEligible ?? false,
          fallbackPolicyId: pack.fallbackPolicySlug
            ? fallbackPolicyBySlug.get(pack.fallbackPolicySlug)?.id ?? null
            : null,
          status: pack.status ?? "active",
        },
      });
    }

    const entitlementPacks = await tx.entitlementPack.findMany({
      where: { slug: { in: ENTITLEMENT_PACKS.map((pack) => pack.slug) } },
    });
    const entitlementPackBySlug = new Map(
      entitlementPacks.map((pack) => [pack.slug, pack]),
    );

    for (const pack of ENTITLEMENT_PACKS) {
      const entitlementPack = entitlementPackBySlug.get(pack.slug);
      if (!entitlementPack) {
        continue;
      }

      for (const allowance of pack.allowances) {
        const skillDefinition = skillBySlug.get(allowance.skillSlug);
        if (!skillDefinition) {
          continue;
        }

        await tx.entitlementPackSkill.upsert({
          where: {
            entitlementPackId_skillDefinitionId_meterKey: {
              entitlementPackId: entitlementPack.id,
              skillDefinitionId: skillDefinition.id,
              meterKey: allowance.meterKey,
            },
          },
          update: {
            includedUnits: allowance.includedUnits ?? null,
            softLimit: allowance.softLimit ?? null,
            hardLimit: allowance.hardLimit ?? null,
          },
          create: {
            entitlementPackId: entitlementPack.id,
            skillDefinitionId: skillDefinition.id,
            meterKey: allowance.meterKey,
            includedUnits: allowance.includedUnits ?? null,
            softLimit: allowance.softLimit ?? null,
            hardLimit: allowance.hardLimit ?? null,
          },
        });
      }
    }

    for (const item of CATALOG_ITEMS) {
      const catalogItem = catalogItemBySlug.get(item.slug);
      if (!catalogItem) {
        continue;
      }

      for (const link of item.entitlements ?? []) {
        const entitlementPack = entitlementPackBySlug.get(link.entitlementPackSlug);
        if (!entitlementPack) {
          continue;
        }

        await tx.catalogItemEntitlement.upsert({
          where: {
            catalogItemId_entitlementPackId: {
              catalogItemId: catalogItem.id,
              entitlementPackId: entitlementPack.id,
            },
          },
          update: {
            grantOnAttach: link.grantOnAttach ?? true,
            displayOrder: link.displayOrder ?? 0,
          },
          create: {
            catalogItemId: catalogItem.id,
            entitlementPackId: entitlementPack.id,
            grantOnAttach: link.grantOnAttach ?? true,
            displayOrder: link.displayOrder ?? 0,
          },
        });
      }
    }

    for (const template of USE_CASE_TEMPLATES) {
      await tx.useCaseTemplate.upsert({
        where: { slug: template.slug },
        update: {
          name: template.name,
          description: template.description,
          category: template.category ?? "assistant",
          agentKind: template.agentKind,
          defaultExecutionMode: template.defaultExecutionMode,
          defaultWorkerTier: template.defaultWorkerTier ?? WorkerTier.standard,
          defaultTransportPolicy: template.defaultTransportPolicy,
          defaultBrainPolicy: template.defaultBrainPolicy,
          templateSpec: template.templateSpec,
          promptSpec: template.promptSpec,
          guardrailSpec: template.guardrailSpec,
          scheduleSpec: template.scheduleSpec,
          memorySpec: template.memorySpec,
          approvalSpec: template.approvalSpec,
          status: template.status ?? "active",
        },
        create: {
          slug: template.slug,
          name: template.name,
          description: template.description,
          category: template.category ?? "assistant",
          agentKind: template.agentKind,
          defaultExecutionMode: template.defaultExecutionMode,
          defaultWorkerTier: template.defaultWorkerTier ?? WorkerTier.standard,
          defaultTransportPolicy: template.defaultTransportPolicy,
          defaultBrainPolicy: template.defaultBrainPolicy,
          templateSpec: template.templateSpec,
          promptSpec: template.promptSpec,
          guardrailSpec: template.guardrailSpec,
          scheduleSpec: template.scheduleSpec,
          memorySpec: template.memorySpec,
          approvalSpec: template.approvalSpec,
          status: template.status ?? "active",
        },
      });
    }

    const useCaseTemplates = await tx.useCaseTemplate.findMany({
      where: { slug: { in: USE_CASE_TEMPLATES.map((template) => template.slug) } },
    });
    const useCaseTemplateBySlug = new Map(
      useCaseTemplates.map((template) => [template.slug, template]),
    );

    for (const template of USE_CASE_TEMPLATES) {
      const useCaseTemplate = useCaseTemplateBySlug.get(template.slug);
      if (!useCaseTemplate) {
        continue;
      }

      for (const item of template.items) {
        const catalogItem = catalogItemBySlug.get(item.catalogItemSlug);
        if (!catalogItem) {
          continue;
        }

        await tx.useCaseTemplateItem.upsert({
          where: {
            useCaseTemplateId_catalogItemId_inclusionType: {
              useCaseTemplateId: useCaseTemplate.id,
              catalogItemId: catalogItem.id,
              inclusionType: item.inclusionType,
            },
          },
          update: {
            defaultEnabled: item.defaultEnabled ?? true,
            displayOrder: item.displayOrder ?? 0,
          },
          create: {
            useCaseTemplateId: useCaseTemplate.id,
            catalogItemId: catalogItem.id,
            inclusionType: item.inclusionType,
            defaultEnabled: item.defaultEnabled ?? true,
            displayOrder: item.displayOrder ?? 0,
          },
        });
      }

      for (const entitlement of template.entitlements) {
        const entitlementPack = entitlementPackBySlug.get(
          entitlement.entitlementPackSlug,
        );
        if (!entitlementPack) {
          continue;
        }

        await tx.useCaseTemplateEntitlement.upsert({
          where: {
            useCaseTemplateId_entitlementPackId: {
              useCaseTemplateId: useCaseTemplate.id,
              entitlementPackId: entitlementPack.id,
            },
          },
          update: {
            provisioningMode: entitlement.provisioningMode,
            displayOrder: entitlement.displayOrder ?? 0,
          },
          create: {
            useCaseTemplateId: useCaseTemplate.id,
            entitlementPackId: entitlementPack.id,
            provisioningMode: entitlement.provisioningMode,
            displayOrder: entitlement.displayOrder ?? 0,
          },
        });
      }
    }
  });
}

export async function syncCapabilityCommerceCatalog(): Promise<void> {
  if (Date.now() - lastSuccessfulSyncAt < SYNC_TTL_MS) {
    return;
  }

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = doSyncCapabilityCommerceCatalog()
    .then(() => {
      lastSuccessfulSyncAt = Date.now();
    })
    .finally(() => {
      syncPromise = null;
    });
  return syncPromise;
}

export function resolveDefaultUseCaseTemplateSlug(params: {
  agentKind: AgentKind;
  productUseCase?: string | null;
}): string {
  switch (params.agentKind) {
    case AgentKind.synthetic_employee:
      return USE_CASE_TEMPLATE_SLUG.syntheticEmployee;
    case AgentKind.matt_support:
      return USE_CASE_TEMPLATE_SLUG.mattSupport;
    case AgentKind.matt_account_manager:
      return USE_CASE_TEMPLATE_SLUG.mattAccountManager;
    case AgentKind.internal_ops:
    case AgentKind.fleet_worker:
      return USE_CASE_TEMPLATE_SLUG.mattOps;
    case AgentKind.customer_agent:
    default:
      return params.productUseCase === "fleet"
        ? USE_CASE_TEMPLATE_SLUG.customerFleet
        : USE_CASE_TEMPLATE_SLUG.customerAssistant;
  }
}

export function listBuiltInUseCaseTemplateSlugs(): string[] {
  return USE_CASE_TEMPLATES.map((template) => template.slug);
}
