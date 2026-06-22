import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = (process.env.DATABASE_URL ?? "").replace(/^﻿/, "") || undefined;
  if (!connectionString) {
    // During build/type generation without a real DB, return a mock-free instance
    // that will fail gracefully at runtime instead of at module load
    const adapter = new PrismaPg({ connectionString: "postgresql://localhost:5432/placeholder" });
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
