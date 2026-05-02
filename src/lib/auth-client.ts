"use client";
// Client-side auth helpers. Components import { signIn, signUp, signOut, useSession } from here.

import { createAuthClient } from "better-auth/react";

// No explicit baseURL: better-auth defaults to window.location.origin, which
// is exactly what we want everywhere — http://localhost:3000 in dev, the
// real prod origin on Vercel. A hardcoded NEXT_PUBLIC_BETTER_AUTH_URL would
// require keeping a client-visible env var in sync with the actual deploy
// hostname, and getting it wrong yields a "Failed to fetch" with no
// server-side log because the request never even leaves the browser.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
