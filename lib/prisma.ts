import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

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

// Initialize Prisma Client
function getPrismaClient(): PrismaClient | typeof mockDb {
  if (isBuildPhase) {
    return mockDb as any;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" 
        ? ["query", "error", "warn"] 
        : ["error"],
    });
  }
  
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient() as PrismaClient;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (isBuildPhase) return true;
  
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
if (process.env.NODE_ENV !== "production" && !isBuildPhase) {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
