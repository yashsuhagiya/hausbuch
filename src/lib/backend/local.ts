// LocalBackend — wraps the existing localStorage-backed storage layer
// behind the async Backend interface so callers can be backend-agnostic.

import * as storage from "../storage";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "../types";
import type { Backend, BackendSnapshot } from "./types";

const POSTED_KEY = "hausbuch:posted-months";

export const localBackend: Backend = {
  async pull(): Promise<BackendSnapshot> {
    return {
      entries: storage.getEntries(),
      recurring: storage.getRecurring(),
      categories: storage.getCategories(),
      accounts: storage.getAccounts(),
      snapshots: storage.getSnapshots(),
      postedMonths: readPostedSync(),
    };
  },

  async upsertEntry(entry: Entry): Promise<void> {
    // storage.addEntry generates an id, but here the entry is fully formed —
    // we either patch in place if it exists or append otherwise. This keeps
    // ids stable across local/remote mutations.
    const existing = storage.getEntries().find((e) => e.id === entry.id);
    if (existing) {
      storage.updateEntry(entry.id, entry);
    } else {
      // bypass id-generation: write the entry through directly via raw writer
      writeEntryRaw(entry);
    }
  },

  async deleteEntry(id: ID): Promise<void> {
    storage.deleteEntry(id);
  },

  async upsertRecurring(r: Recurring): Promise<void> {
    storage.upsertRecurring(r);
  },

  async deleteRecurring(id: ID): Promise<void> {
    storage.deleteRecurring(id);
  },

  async upsertCategory(c: Category): Promise<void> {
    storage.upsertCategory(c);
  },

  async upsertAccount(a: Account): Promise<void> {
    storage.upsertAccount(a);
  },

  async addSnapshot(s: Snapshot): Promise<void> {
    // storage.addSnapshot generates an id; we already have one, so write raw.
    writeSnapshotRaw(s);
  },

  async markPosted(m: ISOMonth): Promise<void> {
    storage.markPosted(m);
  },
};

function readPostedSync(): ISOMonth[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(POSTED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// storage.ts encapsulates id generation in addEntry/addSnapshot. For
// hydrate-replays where we already have a fully-formed row, we write the
// JSON directly — same key as storage uses, no migration risk.
function writeEntryRaw(entry: Entry): void {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem("hausbuch:entries");
  const all: Entry[] = raw ? JSON.parse(raw) : [];
  all.push(entry);
  localStorage.setItem("hausbuch:entries", JSON.stringify(all));
}

function writeSnapshotRaw(snap: Snapshot): void {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem("hausbuch:meta");
  const meta = raw
    ? (JSON.parse(raw) as { categories: Category[]; accounts: Account[]; snapshots: Snapshot[] })
    : { categories: [], accounts: [], snapshots: [] };
  meta.snapshots.push(snap);
  localStorage.setItem("hausbuch:meta", JSON.stringify(meta));
}
