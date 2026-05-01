// Backend interface — abstracts where Hausbuch data lives.
// LocalBackend reads/writes browser localStorage (single-device, offline-first).
// RemoteBackend reads/writes Postgres via server actions (signed-in, multi-device).

import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "../types";

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

  // Mutations are upserts: callers pass the full row with a client-generated id.
  // RemoteBackend trusts the id; LocalBackend uses it as-is too.
  upsertEntry(entry: Entry): Promise<void>;
  deleteEntry(id: ID): Promise<void>;

  upsertRecurring(recurring: Recurring): Promise<void>;
  deleteRecurring(id: ID): Promise<void>;

  upsertCategory(category: Category): Promise<void>;
  upsertAccount(account: Account): Promise<void>;
  addSnapshot(snapshot: Snapshot): Promise<void>;

  markPosted(month: ISOMonth): Promise<void>;
}
