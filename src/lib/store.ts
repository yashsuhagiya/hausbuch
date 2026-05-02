import { create } from "zustand";
import { remoteBackend } from "./backend/remote";
import { monthOf } from "./date";
import { newId } from "./ids";
import { postRecurringForCurrent } from "./recurring";
import { SEED_ACCOUNTS, SEED_CATEGORIES } from "./seed";
import { migrateFromLocalAction } from "./sync-actions";
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

  entriesForMonth: (m: ISOMonth) => Entry[];
}

export function computeStats(entries: Entry[]) {
  const inc = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const out = entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  return { in: inc, out, net: inc + out };
}

let inflight = 0;

export const useStore = create<State>((set, get) => {
  function reflect(p: Promise<void>) {
    inflight++;
    set({ pendingWrites: inflight, syncStatus: "syncing" });
    p.then(
      () => {
        inflight--;
        set({ pendingWrites: inflight, syncStatus: inflight === 0 ? "ok" : "syncing" });
      },
      (err) => {
        console.error("[sync] write failed:", err);
        inflight--;
        set({ pendingWrites: inflight, syncStatus: "failing" });
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
        let snap = await remoteBackend.pull();
        if (snap.categories.length === 0 && snap.accounts.length === 0) {
          await migrateFromLocalAction({
            entries: [],
            recurring: [],
            categories: SEED_CATEGORIES,
            accounts: SEED_ACCOUNTS,
            snapshots: [],
            postedMonths: [],
          });
          snap = await remoteBackend.pull();
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
        const snap = await remoteBackend.pull();
        set({
          entries: snap.entries,
          recurring: snap.recurring,
          categories: snap.categories,
          accounts: snap.accounts,
          snapshots: snap.snapshots,
          postedMonths: new Set(snap.postedMonths),
          syncStatus: inflight === 0 ? "ok" : "syncing",
        });
      } catch (err) {
        console.error("[refresh] failed:", err);
        set({ syncStatus: "failing" });
      }
    },

    reset: () => {
      inflight = 0;
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
      reflect(remoteBackend.upsertEntry(created));
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
      if (updated) reflect(remoteBackend.upsertEntry(updated));
    },
    deleteEntry: (id) => {
      set((s) => ({ entries: s.entries.filter((x) => x.id !== id) }));
      reflect(remoteBackend.deleteEntry(id));
    },

    upsertRecurring: (r) => {
      set((s) => ({ recurring: [...s.recurring.filter((x) => x.id !== r.id), r] }));
      reflect(remoteBackend.upsertRecurring(r));
    },
    deleteRecurring: (id) => {
      set((s) => ({ recurring: s.recurring.filter((x) => x.id !== id) }));
      reflect(remoteBackend.deleteRecurring(id));
    },

    upsertCategory: (c) => {
      set((s) => ({ categories: [...s.categories.filter((x) => x.id !== c.id), c] }));
      reflect(remoteBackend.upsertCategory(c));
    },
    upsertAccount: (a) => {
      set((s) => ({ accounts: [...s.accounts.filter((x) => x.id !== a.id), a] }));
      reflect(remoteBackend.upsertAccount(a));
    },
    addSnapshot: (s) => {
      const created: Snapshot = { id: newId(), ...s };
      set((st) => ({ snapshots: [...st.snapshots, created] }));
      reflect(remoteBackend.addSnapshot(created));
    },

    markPosted: (m) => {
      set((s) => ({ postedMonths: new Set(s.postedMonths).add(m) }));
      reflect(remoteBackend.markPosted(m));
    },

    entriesForMonth: (m) => get().entries.filter((e) => monthOf(e.date) === m),
  };
});
