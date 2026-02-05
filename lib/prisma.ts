import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Mock implementation for build phase to avoid DB connection errors
const mockDb = {
  agent: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: (args: any) => Promise.resolve({ id: "mock-" + Date.now(), ...args.data }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  payment: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: (args: any) => Promise.resolve({ 
      id: "pay-" + Date.now(), 
      address: "0x" + "1".repeat(40),
      ...args.data 
    }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: (fn: any) => Promise.resolve(fn(mockDb)),
};

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

export const prisma = isBuildPhase 
  ? mockDb as any 
  : (globalForPrisma.prisma ?? new PrismaClient());

if (!isBuildPhase && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma as PrismaClient;
}
