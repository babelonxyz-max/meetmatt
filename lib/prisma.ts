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
type MockUpdateManyArgs = { where?: Record<string, unknown>; data?: Record<string, unknown> };
type MockFindFirstArgs = { where?: Record<string, unknown> };
type MockCountArgs = { where?: Record<string, unknown> };

interface MockModel {
  findMany: (args?: Record<string, unknown>) => Promise<MockRecord[]>;
  findUnique: (args?: Record<string, unknown>) => Promise<MockRecord | null>;
  findFirst: (args?: MockFindFirstArgs) => Promise<MockRecord | null>;
  create: (args: MockCreateArgs) => Promise<MockRecord>;
  update: (args?: Record<string, unknown>) => Promise<MockRecord>;
  updateMany: (args?: MockUpdateManyArgs) => Promise<{ count: number }>;
  delete: (args?: Record<string, unknown>) => Promise<MockRecord>;
  count: (args?: MockCountArgs) => Promise<number>;
}

interface MockDbClient {
  user: MockModel;
  agent: MockModel;
  payment: MockModel;
  deployJob: MockModel;
  walletPool: MockModel;
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
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "mock-" + Date.now(), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  agent: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "mock-" + Date.now(), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  payment: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "pay-" + Date.now(), address: "0x" + "1".repeat(40), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  deployJob: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "deploy-job-" + Date.now(), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
  walletPool: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: (args: MockCreateArgs) => Promise.resolve({ id: "wallet-" + Date.now(), address: "0x" + "1".repeat(40), ...(args.data ?? {}) }),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
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
      connectionString: process.env.POSTGRES_PRISMA_URL || connectionString,
      max: 5,                       // Max connections per serverless instance
      idleTimeoutMillis: 30000,     // Close idle after 30s
      connectionTimeoutMillis: 5000, // Fail fast if can't connect
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
