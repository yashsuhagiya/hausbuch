import { create } from "zustand";
import { getBackend } from "./backend";
import { monthOf } from "./date";
import { newId } from "./ids";
import { postRecurringForCurrent } from "./recurring";
import { SEED_ACCOUNTS, SEED_CATEGORIES } from "./seed";
import * as storage from "./storage";
import { migrateFromLocalAction } from "./sync-actions";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "./types";

interface State {
  hydrated: boolean;
  signedIn: boolean;
  entries: Entry[];
  recurring: Recurring[];
  categories: Category[];
  accounts: Account[];
  snapshots: Snapshot[];
  postedMonths: Set<ISOMonth>;

  hydrate: (signedIn?: boolean) => Promise<void>;
  reset: () => void;

  addEntry: (e: Omit<Entry, "id">) => Entry;
  updateEntry: (id: ID, patch: Partial<Entry>) => void;
  deleteEntry: (id: ID) => void;

  upsertRecurring: (r: Recurring) => void;
  deleteRecurring: (id: ID) => void;

  upsertCategory: (c: Category) => void;
  upsertAccount: (a: Account) => void;
  addSnapshot: (s: Omit<Snapshot, "id">) => void;

  markPosted: (m: ISOMonth) => void;

  entriesForMonth: (m: ISOMonth) => Entry[];
}

// helper exported separately for testability (used by stats-strip in Task 7)
export function computeStats(entries: Entry[]) {
  const inc = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const out = entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  return { in: inc, out, net: inc + out };
}

// Server-side reflection of every local mutation when signed in. We don't await
// — the UI updates from the optimistic local write immediately. Failures are
// logged; Phase 3.5 will queue them for retry on reconnect.
function reflectRemote(operation: () => Promise<void>): void {
  operation().catch((err) => {
    console.error("[remote-sync] failed:", err);
  });
}

function isEmpty(snap: {
  entries: unknown[];
  recurring: unknown[];
  categories: unknown[];
  accounts: unknown[];
  snapshots: unknown[];
  postedMonths: unknown[];
}): boolean {
  return (
    snap.entries.length === 0 &&
    snap.recurring.length === 0 &&
    snap.categories.length === 0 &&
    snap.accounts.length === 0 &&
    snap.snapshots.length === 0 &&
    snap.postedMonths.length === 0
  );
}

export const useStore = create<State>((set, get) => ({
  hydrated: false,
  signedIn: false,
  entries: [],
  recurring: [],
  categories: [],
  accounts: [],
  snapshots: [],
  postedMonths: new Set(),

  hydrate: async (signedIn = false) => {
    storage.runMigrations();

    // Seed defaults into local before deciding which backend to read from —
    // a signed-in user with an empty server account still needs categories/accounts
    // to render. Phase 4 will push these to the server on first sign-in.
    if (storage.getCategories().length === 0) SEED_CATEGORIES.forEach(storage.upsertCategory);
    if (storage.getAccounts().length === 0) SEED_ACCOUNTS.forEach(storage.upsertAccount);

    const backend = getBackend(signedIn);
    try {
      let snap = await backend.pull();
      // First-sign-in migration: server has no rows for this user yet, but
      // localStorage already has data. Push everything up so this device's
      // history isn't orphaned, then re-pull so timestamps come from the DB.
      if (signedIn && isEmpty(snap)) {
        const local = await getBackend(false).pull();
        if (!isEmpty(local)) {
          await migrateFromLocalAction(local);
          snap = await backend.pull();
        }
      }
      set({
        hydrated: true,
        signedIn,
        entries: snap.entries,
        recurring: snap.recurring,
        categories: snap.categories,
        accounts: snap.accounts,
        snapshots: snap.snapshots,
        postedMonths: new Set(snap.postedMonths),
      });
    } catch (err) {
      // Remote failure (offline, server error) → fall back to local cache
      // so the app stays usable. A toast/banner can surface this later.
      console.error("[hydrate] remote pull failed, falling back to local:", err);
      const local = await getBackend(false).pull();
      set({
        hydrated: true,
        signedIn: false, // mutations should stay local-only until reconnect
        entries: local.entries,
        recurring: local.recurring,
        categories: local.categories,
        accounts: local.accounts,
        snapshots: local.snapshots,
        postedMonths: new Set(local.postedMonths),
      });
    }

    postRecurringForCurrent();
  },

  reset: () =>
    set({
      hydrated: false,
      signedIn: false,
      entries: [],
      recurring: [],
      categories: [],
      accounts: [],
      snapshots: [],
      postedMonths: new Set(),
    }),

  addEntry: (e) => {
    // Generate id locally so both LS and remote use the same id — keeps
    // optimistic UI stable and avoids round-trip races.
    const created: Entry = { id: newId(), ...e };
    storage.addEntry(created); // LocalBackend write (always); ignored return id since we already have ours
    set((s) => ({ entries: [...s.entries, created] }));
    if (get().signedIn) reflectRemote(() => getBackend(true).upsertEntry(created));
    return created;
  },
  updateEntry: (id, patch) => {
    const updated = storage.updateEntry(id, patch);
    set((s) => ({ entries: s.entries.map((x) => (x.id === id ? updated : x)) }));
    if (get().signedIn) reflectRemote(() => getBackend(true).upsertEntry(updated));
  },
  deleteEntry: (id) => {
    storage.deleteEntry(id);
    set((s) => ({ entries: s.entries.filter((x) => x.id !== id) }));
    if (get().signedIn) reflectRemote(() => getBackend(true).deleteEntry(id));
  },

  upsertRecurring: (r) => {
    storage.upsertRecurring(r);
    set((s) => ({ recurring: [...s.recurring.filter((x) => x.id !== r.id), r] }));
    if (get().signedIn) reflectRemote(() => getBackend(true).upsertRecurring(r));
  },
  deleteRecurring: (id) => {
    storage.deleteRecurring(id);
    set((s) => ({ recurring: s.recurring.filter((x) => x.id !== id) }));
    if (get().signedIn) reflectRemote(() => getBackend(true).deleteRecurring(id));
  },

  upsertCategory: (c) => {
    storage.upsertCategory(c);
    set((s) => ({ categories: [...s.categories.filter((x) => x.id !== c.id), c] }));
    if (get().signedIn) reflectRemote(() => getBackend(true).upsertCategory(c));
  },
  upsertAccount: (a) => {
    storage.upsertAccount(a);
    set((s) => ({ accounts: [...s.accounts.filter((x) => x.id !== a.id), a] }));
    if (get().signedIn) reflectRemote(() => getBackend(true).upsertAccount(a));
  },
  addSnapshot: (s) => {
    const created: Snapshot = { id: newId(), ...s };
    storage.addSnapshot(created); // returned id ignored — we already pinned ours
    set((st) => ({ snapshots: [...st.snapshots, created] }));
    if (get().signedIn) reflectRemote(() => getBackend(true).addSnapshot(created));
  },

  markPosted: (m) => {
    storage.markPosted(m);
    set((s) => ({ postedMonths: new Set(s.postedMonths).add(m) }));
    if (get().signedIn) reflectRemote(() => getBackend(true).markPosted(m));
  },

  entriesForMonth: (m) => get().entries.filter((e) => monthOf(e.date) === m),
}));
