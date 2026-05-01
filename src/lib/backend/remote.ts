// RemoteBackend — calls Next.js server actions that hit Postgres.
// Authentication is enforced server-side via the Better Auth session;
// the client just calls and lets the action throw if not signed in.

import {
  addSnapshotAction,
  deleteEntryAction,
  deleteRecurringAction,
  markPostedAction,
  pullSnapshot,
  upsertAccountAction,
  upsertCategoryAction,
  upsertEntryAction,
  upsertRecurringAction,
} from "../sync-actions";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "../types";
import type { Backend, BackendSnapshot } from "./types";

export const remoteBackend: Backend = {
  async pull(): Promise<BackendSnapshot> {
    return pullSnapshot();
  },

  async upsertEntry(entry: Entry): Promise<void> {
    await upsertEntryAction(entry);
  },

  async deleteEntry(id: ID): Promise<void> {
    await deleteEntryAction(id);
  },

  async upsertRecurring(r: Recurring): Promise<void> {
    await upsertRecurringAction(r);
  },

  async deleteRecurring(id: ID): Promise<void> {
    await deleteRecurringAction(id);
  },

  async upsertCategory(c: Category): Promise<void> {
    await upsertCategoryAction(c);
  },

  async upsertAccount(a: Account): Promise<void> {
    await upsertAccountAction(a);
  },

  async addSnapshot(s: Snapshot): Promise<void> {
    await addSnapshotAction(s);
  },

  async markPosted(m: ISOMonth): Promise<void> {
    await markPostedAction(m);
  },
};
