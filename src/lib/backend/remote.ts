// RemoteBackend — calls Next.js server actions that hit Postgres.
// Authentication is enforced server-side via the Better Auth session;
// the client just calls and lets the action throw if not signed in.

import { pullSnapshot } from "../sync-actions";
import type { Backend, BackendSnapshot } from "./types";

export const remoteBackend: Backend = {
  async pull(): Promise<BackendSnapshot> {
    return pullSnapshot();
  },
};
