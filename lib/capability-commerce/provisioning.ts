import {
  Prisma,
  UseCaseTemplateProvisioningMode,
  UseCaseTemplateItemInclusionType,
  LoadoutItemState,
  EntitlementGrantStatus,
  EntitlementResetPolicy,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolveDefaultUseCaseTemplateSlug,
  syncCapabilityCommerceCatalog,
} from "@/lib/capability-commerce/registry";

type TemplateWithRelations = Prisma.UseCaseTemplateGetPayload<{
  include: {
    items: {
      include: {
        catalogItem: {
          include: {
            skillLinks: {
              include: {
                skillDefinition: true,
              };
            };
            entitlementLinks: {
              include: {
                entitlementPack: {
                  include: {
                    skillAllowances: {
                      include: {
                        skillDefinition: true,
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
    entitlements: {
      include: {
        entitlementPack: {
          include: {
            skillAllowances: {
              include: {
                skillDefinition: true,
              };
            };
          };
        };
      };
    };
  };
}>;

type AgentWithCapabilityState = Prisma.AgentGetPayload<{
  include: {
    useCaseTemplate: true;
    loadoutItems: {
      include: {
        catalogItem: {
          include: {
            skillLinks: {
              include: {
                skillDefinition: true;
              };
            };
            entitlementLinks: {
              include: {
                entitlementPack: {
                  include: {
                    skillAllowances: {
                      include: {
                        skillDefinition: true,
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
    skillBindings: {
      include: {
        skillDefinition: {
          include: {
            fallbackPolicy: true;
            implementations: true;
          };
        };
        defaultImplementation: true;
        fallbackPolicy: true;
      };
    };
    entitlementPackGrants: {
      include: {
        entitlementPack: {
          include: {
            skillAllowances: {
              include: {
                skillDefinition: true;
              };
            };
          };
        };
        allowances: {
          include: {
            skillDefinition: true,
          };
        };
      };
      orderBy: [
        { startsAt: "desc" },
        { createdAt: "desc" },
      ];
    };
  };
}>;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function readDurationDays(durationSpec: Prisma.JsonValue | null): number | null {
  if (!durationSpec || Array.isArray(durationSpec) || typeof durationSpec !== "object") {
    return null;
  }

  const maybeDays = (durationSpec as { days?: unknown }).days;
  if (typeof maybeDays === "number" && Number.isFinite(maybeDays) && maybeDays > 0) {
    return maybeDays;
  }

  return null;
}

async function getTemplateBySlug(slug: string): Promise<TemplateWithRelations> {
  const template = await prisma.useCaseTemplate.findUnique({
    where: { slug },
    include: {
      items: {
        include: {
          catalogItem: {
            include: {
              skillLinks: {
                include: {
                  skillDefinition: true,
                },
                orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
              },
              entitlementLinks: {
                include: {
                  entitlementPack: {
                    include: {
                      skillAllowances: {
                        include: {
                          skillDefinition: true,
                        },
                        orderBy: [{ createdAt: "asc" }],
                      },
                    },
                  },
                },
                orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
      entitlements: {
        include: {
          entitlementPack: {
            include: {
              skillAllowances: {
                include: {
                  skillDefinition: true,
                },
                orderBy: [{ createdAt: "asc" }],
              },
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!template) {
    throw { status: 404, message: `Use case template not found: ${slug}` };
  }

  return template;
}

export async function getCapabilityCommerceAgent(agentId: string): Promise<AgentWithCapabilityState> {
  await syncCapabilityCommerceCatalog();

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      useCaseTemplate: true,
      loadoutItems: {
        include: {
          catalogItem: {
            include: {
              skillLinks: {
                include: {
                  skillDefinition: true,
                },
                orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
              },
              entitlementLinks: {
                include: {
                  entitlementPack: {
                    include: {
                      skillAllowances: {
                        include: {
                          skillDefinition: true,
                        },
                        orderBy: [{ createdAt: "asc" }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
      skillBindings: {
        include: {
          skillDefinition: {
            include: {
              fallbackPolicy: true,
              implementations: {
                orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
              },
            },
          },
          defaultImplementation: true,
          fallbackPolicy: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      entitlementPackGrants: {
        include: {
          entitlementPack: {
            include: {
              skillAllowances: {
                include: {
                  skillDefinition: true,
                },
              },
            },
          },
          allowances: {
            include: {
              skillDefinition: true,
            },
            orderBy: [{ createdAt: "asc" }],
          },
        },
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  return agent;
}

function computeGrantEndDate(params: {
  pack: {
    resetPolicy: string;
    durationSpec: Prisma.JsonValue | null;
  };
  agent: {
    currentPeriodEnd: Date | null;
  };
  startsAt: Date;
}): Date | null {
  if (params.pack.resetPolicy === "billing_cycle") {
    return params.agent.currentPeriodEnd ?? null;
  }

  if (params.pack.resetPolicy === "purchase_period") {
    const days = readDurationDays(params.pack.durationSpec);
    return days ? addDays(params.startsAt, days) : null;
  }

  return null;
}

export async function grantEntitlementPackToAgent(params: {
  agentId: string;
  entitlementPackId?: string;
  entitlementPackSlug?: string;
  source: string;
  paymentId?: string | null;
  startsAt?: Date;
  status?: EntitlementGrantStatus;
}): Promise<{ grantId: string; created: boolean }> {
  await syncCapabilityCommerceCatalog();

  const agent = await prisma.agent.findUnique({
    where: { id: params.agentId },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      currentPeriodEnd: true,
      autoTopupDefault: true,
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  const entitlementPack = params.entitlementPackId
    ? await prisma.entitlementPack.findUnique({
        where: { id: params.entitlementPackId },
        include: {
          skillAllowances: true,
        },
      })
    : params.entitlementPackSlug
      ? await prisma.entitlementPack.findUnique({
          where: { slug: params.entitlementPackSlug },
          include: {
            skillAllowances: true,
          },
        })
      : null;

  if (!entitlementPack) {
    throw { status: 404, message: "Entitlement pack not found" };
  }

  if (params.paymentId) {
    const existingByPayment = await prisma.entitlementPackGrant.findFirst({
      where: {
        paymentId: params.paymentId,
        entitlementPackId: entitlementPack.id,
        agentId: agent.id,
      },
      select: { id: true },
    });
    if (existingByPayment) {
      return { grantId: existingByPayment.id, created: false };
    }
  }

  const startsAt = params.startsAt ?? new Date();

  if (entitlementPack.resetPolicy === EntitlementResetPolicy.billing_cycle) {
    await prisma.entitlementPackGrant.updateMany({
      where: {
        agentId: agent.id,
        entitlementPackId: entitlementPack.id,
        status: EntitlementGrantStatus.active,
        endsAt: {
          lt: startsAt,
        },
      },
      data: {
        status: EntitlementGrantStatus.expired,
      },
    });
  }

  const existingGrant = params.paymentId
    ? null
    : await prisma.entitlementPackGrant.findFirst({
        where: {
          agentId: agent.id,
          entitlementPackId: entitlementPack.id,
          source: params.source,
          status: params.status ?? EntitlementGrantStatus.active,
          OR: [
            {
              endsAt: null,
            },
            {
              endsAt: {
                gte: startsAt,
              },
            },
          ],
        },
        select: { id: true },
        orderBy: [{ createdAt: "desc" }],
      });

  if (existingGrant) {
    return { grantId: existingGrant.id, created: false };
  }

  const endsAt = computeGrantEndDate({
    pack: entitlementPack,
    agent: { currentPeriodEnd: agent.currentPeriodEnd },
    startsAt,
  });

  const grant = await prisma.entitlementPackGrant.create({
    data: {
      entitlementPackId: entitlementPack.id,
      scopeType: entitlementPack.scopeType,
      agentId: agent.id,
      userId: agent.userId,
      workspaceId: agent.workspaceId,
      paymentId: params.paymentId ?? null,
      source: params.source,
      status: params.status ?? EntitlementGrantStatus.active,
      startsAt,
      endsAt,
      autoTopupEnabled:
        entitlementPack.autoTopupEligible && agent.autoTopupDefault,
    },
  });

  for (const allowance of entitlementPack.skillAllowances) {
    await prisma.entitlementAllowance.create({
      data: {
        grantId: grant.id,
        skillDefinitionId: allowance.skillDefinitionId,
        meterKey: allowance.meterKey,
        includedUnits: allowance.includedUnits,
        consumedUnits: 0,
        remainingUnits: allowance.includedUnits,
        softLimit: allowance.softLimit,
        hardLimit: allowance.hardLimit,
      },
    });
  }

  return { grantId: grant.id, created: true };
}

export async function attachCatalogItemToAgent(params: {
  agentId: string;
  catalogItemSlug: string;
  source: string;
  paymentId?: string | null;
  grantLinkedEntitlements?: boolean;
}): Promise<{ changed: boolean }> {
  await syncCapabilityCommerceCatalog();

  const [agent, catalogItem] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: params.agentId },
      select: { id: true },
    }),
    prisma.catalogItem.findUnique({
      where: { slug: params.catalogItemSlug },
      include: {
        skillLinks: {
          include: {
            skillDefinition: true,
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
        entitlementLinks: {
          include: {
            entitlementPack: true,
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }
  if (!catalogItem) {
    throw { status: 404, message: "Catalog item not found" };
  }

  let changed = false;

  const existingLoadout = await prisma.agentLoadoutItem.findUnique({
    where: {
      agentId_catalogItemId: {
        agentId: agent.id,
        catalogItemId: catalogItem.id,
      },
    },
    select: { id: true, state: true },
  });

  if (!existingLoadout) {
    await prisma.agentLoadoutItem.create({
      data: {
        agentId: agent.id,
        catalogItemId: catalogItem.id,
        source: params.source,
        state: LoadoutItemState.enabled,
      },
    });
    changed = true;
  } else if (existingLoadout.state !== LoadoutItemState.enabled) {
    await prisma.agentLoadoutItem.update({
      where: { id: existingLoadout.id },
      data: {
        state: LoadoutItemState.enabled,
        source: params.source,
        effectiveFrom: new Date(),
        effectiveTo: null,
      },
    });
    changed = true;
  }

  for (const link of catalogItem.skillLinks) {
    const existingBinding = await prisma.agentSkillBinding.findUnique({
      where: {
        agentId_skillDefinitionId: {
          agentId: agent.id,
          skillDefinitionId: link.skillDefinitionId,
        },
      },
      select: { id: true, status: true },
    });

    if (!existingBinding) {
      await prisma.agentSkillBinding.create({
        data: {
          agentId: agent.id,
          skillDefinitionId: link.skillDefinitionId,
          fallbackPolicyId: link.skillDefinition.fallbackPolicyId,
          status: "active",
        },
      });
      changed = true;
    } else if (existingBinding.status !== "active") {
      await prisma.agentSkillBinding.update({
        where: { id: existingBinding.id },
        data: {
          status: "active",
          fallbackPolicyId: link.skillDefinition.fallbackPolicyId,
        },
      });
      changed = true;
    }
  }

  if (params.grantLinkedEntitlements ?? true) {
    for (const link of catalogItem.entitlementLinks) {
      if (!link.grantOnAttach) {
        continue;
      }

      const grant = await grantEntitlementPackToAgent({
        agentId: agent.id,
        entitlementPackId: link.entitlementPackId,
        source: `${params.source}:pack:${link.entitlementPack.slug}`,
        paymentId: params.paymentId ?? null,
      });
      changed = changed || grant.created;
    }
  }

  if (changed) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        loadoutVersion: {
          increment: 1,
        },
      },
    });
  }

  return { changed };
}

export async function provisionAgentUseCaseBundle(params: {
  agentId: string;
  useCaseTemplateSlug?: string | null;
  provisioningModes?: UseCaseTemplateProvisioningMode[];
  grantPaymentId?: string | null;
}): Promise<{
  templateSlug: string;
  itemsChanged: number;
  grantsChanged: number;
}> {
  await syncCapabilityCommerceCatalog();

  const agent = await prisma.agent.findUnique({
    where: { id: params.agentId },
    select: {
      id: true,
      agentKind: true,
      productUseCase: true,
      useCaseTemplateId: true,
      workerTier: true,
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  const templateSlug =
    params.useCaseTemplateSlug ??
    resolveDefaultUseCaseTemplateSlug({
      agentKind: agent.agentKind,
      productUseCase: agent.productUseCase,
    });
  const template = await getTemplateBySlug(templateSlug);

  let itemsChanged = 0;
  let grantsChanged = 0;
  let metadataChanged = false;

  if (
    agent.useCaseTemplateId !== template.id ||
    agent.workerTier !== template.defaultWorkerTier
  ) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        useCaseTemplateId: template.id,
        workerTier: template.defaultWorkerTier,
      },
    });
    metadataChanged = true;
  }

  for (const item of template.items) {
    if (
      item.inclusionType !== UseCaseTemplateItemInclusionType.included ||
      !item.defaultEnabled
    ) {
      continue;
    }

    const attachResult = await attachCatalogItemToAgent({
      agentId: agent.id,
      catalogItemSlug: item.catalogItem.slug,
      source: `template:${template.slug}`,
      grantLinkedEntitlements: false,
    });
    if (attachResult.changed) {
      itemsChanged += 1;
    }
  }

  const activeModes = params.provisioningModes ?? [
    UseCaseTemplateProvisioningMode.grant_on_create,
  ];
  for (const entitlement of template.entitlements) {
    if (!activeModes.includes(entitlement.provisioningMode)) {
      continue;
    }

    const grantResult = await grantEntitlementPackToAgent({
      agentId: agent.id,
      entitlementPackId: entitlement.entitlementPackId,
      source: `template:${template.slug}:${entitlement.provisioningMode}`,
      paymentId:
        entitlement.provisioningMode ===
        UseCaseTemplateProvisioningMode.grant_on_activate
          ? params.grantPaymentId ?? null
          : null,
    });
    if (grantResult.created) {
      grantsChanged += 1;
    }
  }

  if (metadataChanged && itemsChanged === 0 && grantsChanged === 0) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        loadoutVersion: {
          increment: 1,
        },
      },
    });
  }

  return {
    templateSlug: template.slug,
    itemsChanged,
    grantsChanged,
  };
}

export async function activateAgentCapabilityEntitlements(
  agentId: string,
  params?: {
    paymentId?: string | null;
  },
): Promise<{ templateSlug: string; grantsChanged: number }> {
  const agent = await getCapabilityCommerceAgent(agentId);
  const templateSlug =
    agent.useCaseTemplate?.slug ??
    resolveDefaultUseCaseTemplateSlug({
      agentKind: agent.agentKind,
      productUseCase: agent.productUseCase,
    });
  const result = await provisionAgentUseCaseBundle({
    agentId,
    useCaseTemplateSlug: templateSlug,
    provisioningModes: [UseCaseTemplateProvisioningMode.grant_on_activate],
    grantPaymentId: params?.paymentId ?? null,
  });

  return {
    templateSlug: result.templateSlug,
    grantsChanged: result.grantsChanged,
  };
}

export async function buildAgentLoadoutSnapshot(agentId: string) {
  const agent = await getCapabilityCommerceAgent(agentId);

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      ownerType: agent.ownerType,
      agentKind: agent.agentKind,
      productUseCase: agent.productUseCase,
      workerTier: agent.workerTier,
      useCaseTemplate: agent.useCaseTemplate
        ? {
            id: agent.useCaseTemplate.id,
            slug: agent.useCaseTemplate.slug,
            name: agent.useCaseTemplate.name,
            category: agent.useCaseTemplate.category,
            defaultExecutionMode: agent.useCaseTemplate.defaultExecutionMode,
            defaultWorkerTier: agent.useCaseTemplate.defaultWorkerTier,
          }
        : null,
      loadoutVersion: agent.loadoutVersion,
    },
    items: agent.loadoutItems.map((item) => ({
      id: item.id,
      slug: item.catalogItem.slug,
      name: item.catalogItem.name,
      source: item.source,
      state: item.state,
      itemType: item.catalogItem.itemType,
      scopeType: item.catalogItem.scopeType,
      skills: item.catalogItem.skillLinks.map((link) => ({
        slug: link.skillDefinition.slug,
        name: link.skillDefinition.name,
        role: link.role,
        required: link.required,
      })),
      entitlements: item.catalogItem.entitlementLinks.map((link) => ({
        slug: link.entitlementPack.slug,
        name: link.entitlementPack.name,
        grantOnAttach: link.grantOnAttach,
      })),
    })),
    skillBindings: agent.skillBindings.map((binding) => ({
      id: binding.id,
      slug: binding.skillDefinition.slug,
      name: binding.skillDefinition.name,
      status: binding.status,
      defaultImplementation: binding.defaultImplementation
        ? {
            key: binding.defaultImplementation.implementationKey,
            qualityTier: binding.defaultImplementation.qualityTier,
            runtimeEngine: binding.defaultImplementation.runtimeEngine,
          }
        : null,
      fallbackPolicy: binding.fallbackPolicy?.slug ?? binding.skillDefinition.fallbackPolicy?.slug ?? null,
      implementations: binding.skillDefinition.implementations.map((implementation) => ({
        key: implementation.implementationKey,
        qualityTier: implementation.qualityTier,
        runtimeEngine: implementation.runtimeEngine,
        requiresEntitlement: implementation.requiresEntitlement,
        priority: implementation.priority,
      })),
    })),
    entitlements: agent.entitlementPackGrants.map((grant) => ({
      id: grant.id,
      slug: grant.entitlementPack.slug,
      name: grant.entitlementPack.name,
      source: grant.source,
      status: grant.status,
      paymentId: grant.paymentId,
      startsAt: grant.startsAt,
      endsAt: grant.endsAt,
      autoTopupEnabled: grant.autoTopupEnabled,
      allowances: grant.allowances.map((allowance) => ({
        skillSlug: allowance.skillDefinition.slug,
        skillName: allowance.skillDefinition.name,
        meterKey: allowance.meterKey,
        includedUnits: allowance.includedUnits,
        consumedUnits: allowance.consumedUnits,
        remainingUnits: allowance.remainingUnits,
        softLimit: allowance.softLimit,
        hardLimit: allowance.hardLimit,
      })),
    })),
  };
}
