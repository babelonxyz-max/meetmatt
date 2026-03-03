import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in build phase
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

type MockCreateArgs = { data?: Record<string, unknown> };
type MockRecord = Record<string, unknown>;

interface MockModel {
  findMany: () => Promise<MockRecord[]>;
  findUnique: () => Promise<MockRecord | null>;
  create: (args: MockCreateArgs) => Promise<MockRecord>;
  update: () => Promise<MockRecord>;
  delete: () => Promise<MockRecord>;
}

interface MockDbClient {
  user: MockModel & { count: () => Promise<number> };
  agent: MockModel;
  payment: MockModel;
  walletPool: MockModel & { findFirst: () => Promise<MockRecord | null>; count: () => Promise<number> };
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $transaction: <T>(fn: (db: MockDbClient) => T | Promise<T>) => Promise<T>;
  $queryRaw: () => Promise<number[]>;
}

// Mock implementation for build phase
const mockDb: MockDbClient = {
  user: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "mock-" + Date.now(), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  agent: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "mock-" + Date.now(), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  payment: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "pay-" + Date.now(), address: "0x" + "1".repeat(40), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  walletPool: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "wallet-" + Date.now(), address: "0x" + "1".repeat(40), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: <T>(fn: (db: typeof mockDb) => T | Promise<T>) => Promise.resolve(fn(mockDb)),
  $queryRaw: () => Promise.resolve([1]),
};

// Initialize Prisma Client
function getPrismaClient(): PrismaClient | typeof mockDb {
  if (isBuildPhase) {
    return mockDb as unknown as PrismaClient;
  }

  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("[Prisma] DATABASE_URL is required. Cannot start without a database.");
    }

    // Use pg adapter for PostgreSQL
    const pool = new Pool({
      connectionString: process.env.POSTGRES_PRISMA_URL || connectionString
    });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    });

    console.log("[Prisma] Client initialized with pg adapter");
  }
  
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient() as PrismaClient;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (isBuildPhase) return true;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[Prisma] Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
if (process.env.NODE_ENV !== "production" && !isBuildPhase) {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
