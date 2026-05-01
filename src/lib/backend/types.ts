// Backend interface — abstracts where Hausbuch data lives.
// LocalBackend reads/writes browser localStorage (single-device, offline-first).
// RemoteBackend reads/writes Postgres via server actions (signed-in, multi-device).
//
// Phase 2 only wires the read path (`pull`). Mutations stay in storage.ts directly
// for now; Phase 3 routes them through this interface.

import type { Account, Category, Entry, ISOMonth, Recurring, Snapshot } from "../types";

export interface BackendSnapshot {
  entries: Entry[];
  recurring: Recurring[];
  categories: Category[];
  accounts: Account[];
  snapshots: Snapshot[];
  postedMonths: ISOMonth[];
}

export interface Backend {
  /** Returns everything for the current user (or anonymous local data). */
  pull(): Promise<BackendSnapshot>;
}
