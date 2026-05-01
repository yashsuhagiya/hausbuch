// Singleton Prisma client for server-side use.
// Avoids hot-reload connection storms in dev.
//
// Prisma v7's new prisma-client generator requires a driver adapter.
// We use @prisma/adapter-pg (PostgreSQL) configured from DATABASE_URL.
//
// The exported `prisma` is a Proxy that lazy-initializes on first property
// access. Eager initialization would require DATABASE_URL at module-import
// time, which breaks any code path (tests, type-only imports, build analysis)
// that transitively imports this file without intending to actually query.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
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
