import { create } from "zustand";
import { getBackend } from "./backend";
import { newId } from "./ids";
import { postRecurringForCurrent } from "./recurring";
import { SEED_ACCOUNTS, SEED_CATEGORIES } from "./seed";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "./types";

export type SyncStatus = "idle" | "syncing" | "ok" | "failing";

interface State {
  hydrated: boolean;
  syncStatus: SyncStatus;
  pendingWrites: number;
  entries: Entry[];
  recurring: Recurring[];
  categories: Category[];
  accounts: Account[];
  snapshots: Snapshot[];
  postedMonths: Set<ISOMonth>;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
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
}

export const useStore = create<State>((set, get) => {
  function reflect(p: Promise<void>) {
    const next = get().pendingWrites + 1;
    set({ pendingWrites: next, syncStatus: "syncing" });
    p.then(
      () => {
        const after = get().pendingWrites - 1;
        set({ pendingWrites: after, syncStatus: after === 0 ? "ok" : "syncing" });
      },
      (err) => {
        console.error("[sync] write failed:", err);
        const after = get().pendingWrites - 1;
        set({ pendingWrites: after, syncStatus: "failing" });
      },
    );
  }

  return {
    hydrated: false,
    syncStatus: "idle",
    pendingWrites: 0,
    entries: [],
    recurring: [],
    categories: [],
    accounts: [],
    snapshots: [],
    postedMonths: new Set(),

    hydrate: async () => {
      try {
        const backend = getBackend();
        let snap = await backend.pull();
        if (snap.categories.length === 0 && snap.accounts.length === 0) {
          await backend.migrate({
            entries: [],
            recurring: [],
            categories: SEED_CATEGORIES,
            accounts: SEED_ACCOUNTS,
            snapshots: [],
            postedMonths: [],
          });
          snap = await backend.pull();
        }
        set({
          hydrated: true,
          entries: snap.entries,
          recurring: snap.recurring,
          categories: snap.categories,
          accounts: snap.accounts,
          snapshots: snap.snapshots,
          postedMonths: new Set(snap.postedMonths),
          syncStatus: "ok",
        });
        postRecurringForCurrent();
      } catch (err) {
        console.error("[hydrate] failed:", err);
        set({ hydrated: true, syncStatus: "failing" });
      }
    },

    refresh: async () => {
      try {
        const snap = await getBackend().pull();
        set({
          entries: snap.entries,
          recurring: snap.recurring,
          categories: snap.categories,
          accounts: snap.accounts,
          snapshots: snap.snapshots,
          postedMonths: new Set(snap.postedMonths),
          syncStatus: get().pendingWrites === 0 ? "ok" : "syncing",
        });
      } catch (err) {
        console.error("[refresh] failed:", err);
        set({ syncStatus: "failing" });
      }
    },

    reset: () => {
      set({
        hydrated: false,
        syncStatus: "idle",
        pendingWrites: 0,
        entries: [],
        recurring: [],
        categories: [],
        accounts: [],
        snapshots: [],
        postedMonths: new Set(),
      });
    },

    addEntry: (e) => {
      const created: Entry = { id: newId(), ...e };
      set((s) => ({ entries: [...s.entries, created] }));
      reflect(getBackend().upsertEntry(created));
      return created;
    },
    updateEntry: (id, patch) => {
      let updated: Entry | null = null;
      set((s) => ({
        entries: s.entries.map((x) => {
          if (x.id !== id) return x;
          const u: Entry = { ...x, ...patch, id };
          updated = u;
          return u;
        }),
      }));
      if (updated) reflect(getBackend().upsertEntry(updated));
    },
    deleteEntry: (id) => {
      set((s) => ({ entries: s.entries.filter((x) => x.id !== id) }));
      reflect(getBackend().deleteEntry(id));
    },

    upsertRecurring: (r) => {
      set((s) => ({ recurring: [...s.recurring.filter((x) => x.id !== r.id), r] }));
      reflect(getBackend().upsertRecurring(r));
    },
    deleteRecurring: (id) => {
      set((s) => ({ recurring: s.recurring.filter((x) => x.id !== id) }));
      reflect(getBackend().deleteRecurring(id));
    },

    upsertCategory: (c) => {
      set((s) => ({ categories: [...s.categories.filter((x) => x.id !== c.id), c] }));
      reflect(getBackend().upsertCategory(c));
    },
    upsertAccount: (a) => {
      set((s) => ({ accounts: [...s.accounts.filter((x) => x.id !== a.id), a] }));
      reflect(getBackend().upsertAccount(a));
    },
    addSnapshot: (s) => {
      const created: Snapshot = { id: newId(), ...s };
      set((st) => ({ snapshots: [...st.snapshots, created] }));
      reflect(getBackend().addSnapshot(created));
    },

    markPosted: (m) => {
      set((s) => ({ postedMonths: new Set(s.postedMonths).add(m) }));
      reflect(getBackend().markPosted(m));
    },
  };
});
