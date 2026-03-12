export const OWNER_TYPE = {
  customer: "customer",
  mattInternal: "matt_internal",
} as const;

export const AGENT_KIND = {
  customerAgent: "customer_agent",
  syntheticEmployee: "synthetic_employee",
  mattAccountManager: "matt_account_manager",
  mattSupport: "matt_support",
  internalOps: "internal_ops",
  fleetWorker: "fleet_worker",
} as const;

export const TRANSPORT_PROVIDER = {
  telegramBotApi: "telegram_bot_api",
  telethon: "telethon",
  web: "web",
  none: "none",
} as const;

export const BRAIN_PROVIDER = {
  devin: "devin",
  openclaw: "openclaw",
  cortex: "cortex",
  manual: "manual",
} as const;

export type OwnerType = (typeof OWNER_TYPE)[keyof typeof OWNER_TYPE];
export type AgentKind = (typeof AGENT_KIND)[keyof typeof AGENT_KIND];
export type AgentTransportProvider =
  (typeof TRANSPORT_PROVIDER)[keyof typeof TRANSPORT_PROVIDER];
export type AgentBrainProvider =
  (typeof BRAIN_PROVIDER)[keyof typeof BRAIN_PROVIDER];

type LegacyFeatures = Partial<{
  personality: string;
  useCase: string;
}>;

export interface AgentBlueprint {
  ownerType: OwnerType;
  agentKind: AgentKind;
  productUseCase: string;
  personalityPreset: string;
  transportProvider: AgentTransportProvider;
  brainProvider: AgentBrainProvider;
  deploymentProvider: string | null;
  cortexId: string;
}

export interface AgentBlueprintInput {
  ownerType?: string | null;
  agentKind?: string | null;
  productUseCase?: string | null;
  personalityPreset?: string | null;
  transportProvider?: string | null;
  brainProvider?: string | null;
  deploymentProvider?: string | null;
  cortexId?: string | null;
  features?: string[] | null;
}

function parseLegacyFeatures(features?: string[] | null): LegacyFeatures {
  if (!features?.length) {
    return {};
  }

  try {
    return JSON.parse(features[0] || "{}") as LegacyFeatures;
  } catch {
    return {};
  }
}

export function normalizeUseCase(value?: string | null): "assistant" | "fleet" {
  return value === "fleet" ? "fleet" : "assistant";
}

export function defaultCortexIdForAgentKind(agentKind: AgentKind): string {
  switch (agentKind) {
    case AGENT_KIND.syntheticEmployee:
      return "matt-consumer";
    case AGENT_KIND.mattAccountManager:
      return "matt-account-manager";
    case AGENT_KIND.mattSupport:
      return "matt-support";
    case AGENT_KIND.internalOps:
      return "internal-ops";
    case AGENT_KIND.fleetWorker:
      return "fleet-swarm";
    case AGENT_KIND.customerAgent:
    default:
      return "matt-consumer";
  }
}

function defaultBrainProvider(
  ownerType: OwnerType,
  agentKind: AgentKind,
  productUseCase: "assistant" | "fleet",
): AgentBrainProvider {
  if (ownerType === OWNER_TYPE.mattInternal) {
    if (agentKind === AGENT_KIND.internalOps || agentKind === AGENT_KIND.fleetWorker) {
      return BRAIN_PROVIDER.openclaw;
    }
    return BRAIN_PROVIDER.cortex;
  }

  if (agentKind === AGENT_KIND.syntheticEmployee) {
    return BRAIN_PROVIDER.cortex;
  }

  return productUseCase === "fleet"
    ? BRAIN_PROVIDER.openclaw
    : BRAIN_PROVIDER.devin;
}

function defaultTransportProvider(ownerType: OwnerType): AgentTransportProvider {
  return ownerType === OWNER_TYPE.mattInternal
    ? TRANSPORT_PROVIDER.telethon
    : TRANSPORT_PROVIDER.telegramBotApi;
}

export function deriveAgentBlueprint(input: AgentBlueprintInput): AgentBlueprint {
  const legacy = parseLegacyFeatures(input.features);
  const ownerType =
    input.ownerType === OWNER_TYPE.mattInternal
      ? OWNER_TYPE.mattInternal
      : OWNER_TYPE.customer;

  const agentKind =
    input.agentKind &&
    Object.values(AGENT_KIND).includes(input.agentKind as AgentKind)
      ? (input.agentKind as AgentKind)
      : ownerType === OWNER_TYPE.mattInternal
        ? AGENT_KIND.mattSupport
        : AGENT_KIND.customerAgent;

  const productUseCase = normalizeUseCase(
    input.productUseCase || legacy.useCase || "assistant",
  );

  const personalityPreset =
    input.personalityPreset?.trim() ||
    legacy.personality?.trim() ||
    "professional";

  const brainProvider =
    input.brainProvider &&
    Object.values(BRAIN_PROVIDER).includes(input.brainProvider as AgentBrainProvider)
      ? (input.brainProvider as AgentBrainProvider)
      : defaultBrainProvider(ownerType, agentKind, productUseCase);

  const transportProvider =
    input.transportProvider &&
    Object.values(TRANSPORT_PROVIDER).includes(
      input.transportProvider as AgentTransportProvider,
    )
      ? (input.transportProvider as AgentTransportProvider)
      : defaultTransportProvider(ownerType);

  const deploymentProvider =
    input.deploymentProvider ||
    (brainProvider === BRAIN_PROVIDER.cortex ? BRAIN_PROVIDER.openclaw : brainProvider);

  const cortexId =
    input.cortexId?.trim() || defaultCortexIdForAgentKind(agentKind);

  return {
    ownerType,
    agentKind,
    productUseCase,
    personalityPreset,
    transportProvider,
    brainProvider,
    deploymentProvider,
    cortexId,
  };
}

export function buildCustomerAgentDefaults(params: {
  personality: string;
  useCase?: string;
}): AgentBlueprint {
  return deriveAgentBlueprint({
    ownerType: OWNER_TYPE.customer,
    agentKind: AGENT_KIND.customerAgent,
    productUseCase: normalizeUseCase(params.useCase),
    personalityPreset: params.personality,
    transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
    brainProvider:
      normalizeUseCase(params.useCase) === "fleet"
        ? BRAIN_PROVIDER.openclaw
        : BRAIN_PROVIDER.devin,
    deploymentProvider:
      normalizeUseCase(params.useCase) === "fleet"
        ? BRAIN_PROVIDER.openclaw
        : BRAIN_PROVIDER.devin,
    cortexId: defaultCortexIdForAgentKind(AGENT_KIND.customerAgent),
  });
}
