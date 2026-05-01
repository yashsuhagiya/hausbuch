import { create } from "zustand";
import { getBackend } from "./backend";
import { monthOf } from "./date";
import { postRecurringForCurrent } from "./recurring";
import { SEED_ACCOUNTS, SEED_CATEGORIES } from "./seed";
import * as storage from "./storage";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "./types";

interface State {
  hydrated: boolean;
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

export const useStore = create<State>((set, get) => ({
  hydrated: false,
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
      const snap = await backend.pull();
      // If the remote pull came back empty (new account), fall back to local
      // so seeded categories/accounts still appear. Phase 4 handles upload.
      const empty =
        snap.entries.length === 0 &&
        snap.recurring.length === 0 &&
        snap.categories.length === 0 &&
        snap.accounts.length === 0;
      const source = signedIn && empty ? await getBackend(false).pull() : snap;
      set({
        hydrated: true,
        entries: source.entries,
        recurring: source.recurring,
        categories: source.categories,
        accounts: source.accounts,
        snapshots: source.snapshots,
        postedMonths: new Set(source.postedMonths),
      });
    } catch (err) {
      // Remote failure (offline, server error) → fall back to local cache
      // so the app stays usable. A toast/banner can surface this in Phase 3.
      console.error("[hydrate] remote pull failed, falling back to local:", err);
      const local = await getBackend(false).pull();
      set({
        hydrated: true,
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
      entries: [],
      recurring: [],
      categories: [],
      accounts: [],
      snapshots: [],
      postedMonths: new Set(),
    }),

  addEntry: (e) => {
    const created = storage.addEntry(e);
    set((s) => ({ entries: [...s.entries, created] }));
    return created;
  },
  updateEntry: (id, patch) => {
    const updated = storage.updateEntry(id, patch);
    set((s) => ({ entries: s.entries.map((x) => (x.id === id ? updated : x)) }));
  },
  deleteEntry: (id) => {
    storage.deleteEntry(id);
    set((s) => ({ entries: s.entries.filter((x) => x.id !== id) }));
  },

  upsertRecurring: (r) => {
    storage.upsertRecurring(r);
    set((s) => ({ recurring: [...s.recurring.filter((x) => x.id !== r.id), r] }));
  },
  deleteRecurring: (id) => {
    storage.deleteRecurring(id);
    set((s) => ({ recurring: s.recurring.filter((x) => x.id !== id) }));
  },

  upsertCategory: (c) => {
    storage.upsertCategory(c);
    set((s) => ({ categories: [...s.categories.filter((x) => x.id !== c.id), c] }));
  },
  upsertAccount: (a) => {
    storage.upsertAccount(a);
    set((s) => ({ accounts: [...s.accounts.filter((x) => x.id !== a.id), a] }));
  },
  addSnapshot: (s) => {
    const created = storage.addSnapshot(s);
    set((st) => ({ snapshots: [...st.snapshots, created] }));
  },

  markPosted: (m) => {
    storage.markPosted(m);
    set((s) => ({ postedMonths: new Set(s.postedMonths).add(m) }));
  },

  entriesForMonth: (m) => get().entries.filter((e) => monthOf(e.date) === m),
}));
