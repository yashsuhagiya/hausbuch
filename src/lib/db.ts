import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  if (process.env.PRISMA_DATABASE_URL) {
    return new PrismaClient({ accelerateUrl: process.env.PRISMA_DATABASE_URL }).$extends(
      withAccelerate(),
    ) as unknown as PrismaClient;
  }
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("No database URL set (PRISMA_DATABASE_URL / POSTGRES_URL / DATABASE_URL)");
  const adapter = new PrismaPg({ connectionString: url, max: 1 });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = makeClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop, receiver) => Reflect.get(getClient(), prop, receiver),
});
