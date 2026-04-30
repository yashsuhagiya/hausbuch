import { create } from "zustand";
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

  hydrate: () => void;
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

  hydrate: () => {
    storage.runMigrations();
    let categories = storage.getCategories();
    let accounts = storage.getAccounts();
    if (categories.length === 0) {
      SEED_CATEGORIES.forEach(storage.upsertCategory);
      categories = storage.getCategories();
    }
    if (accounts.length === 0) {
      SEED_ACCOUNTS.forEach(storage.upsertAccount);
      accounts = storage.getAccounts();
    }
    set({
      hydrated: true,
      entries: storage.getEntries(),
      recurring: storage.getRecurring(),
      categories,
      accounts,
      snapshots: storage.getSnapshots(),
      postedMonths: new Set(readPosted()),
    });
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

function readPosted(): ISOMonth[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("hausbuch:posted-months") ?? "[]");
  } catch {
    return [];
  }
}
