// Better Auth server config.
// Wires the Prisma adapter against our schema. Our `AuthAccount` model
// needs the `account.modelName` override since Better Auth defaults to
// "Account" and we renamed it to avoid collision with Hausbuch's BookAccount.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  socialProviders: googleConfigured
    ? {
        google: {
          // biome-ignore lint/style/noNonNullAssertion: googleConfigured guards both
          clientId: process.env.GOOGLE_CLIENT_ID!,
          // biome-ignore lint/style/noNonNullAssertion: googleConfigured guards both
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  account: { modelName: "AuthAccount" },
});
