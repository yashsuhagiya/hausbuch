// Better Auth server config.
// Wires the Prisma adapter against our schema. Our `AuthAccount` model
// needs the `account.modelName` override since Better Auth defaults to
// "Account" and we renamed it to avoid collision with Hausbuch's BookAccount.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Resolve the canonical baseURL with Vercel-aware fallbacks so deployments
// don't 403 sign-up requests when an admin forgets to set BETTER_AUTH_URL.
// Better Auth compares the request Origin header against this value; mismatch
// → 403 with no useful body, which is what bit us in production.
//   - BETTER_AUTH_URL: explicit override, used for both local dev and prod.
//   - VERCEL_PROJECT_PRODUCTION_URL: Vercel auto-injects the canonical
//     production domain (custom domain if attached). Available in prod env.
//   - VERCEL_URL: per-deployment URL, available everywhere on Vercel.
//   - localhost fallback for local dev when no env vars are set.
function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const baseURL = resolveBaseURL();

// Trust both the canonical baseURL and any Vercel-deploy URL the request might
// arrive on (preview deploys, the *.vercel.app shadow domain). Without this,
// hitting the *.vercel.app URL of a production deploy 403s because the Origin
// header doesn't match the custom domain in BETTER_AUTH_URL.
const trustedOrigins: string[] = [baseURL];
if (process.env.VERCEL_URL) trustedOrigins.push(`https://${process.env.VERCEL_URL}`);
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  trustedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  trustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24,
  },
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
