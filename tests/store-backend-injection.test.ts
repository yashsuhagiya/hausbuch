import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { remoteBackend, setBackend } from "@/lib/backend";
import type { Backend, BackendSnapshot } from "@/lib/backend/types";
import { useStore } from "@/lib/store";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "@/lib/types";

function makeFakeBackend(initial?: Partial<BackendSnapshot>): Backend & {
  calls: { method: string; arg?: unknown }[];
  state: BackendSnapshot;
} {
  const state: BackendSnapshot = {
    entries: initial?.entries ?? [],
    recurring: initial?.recurring ?? [],
    categories: initial?.categories ?? [],
    accounts: initial?.accounts ?? [],
    snapshots: initial?.snapshots ?? [],
    postedMonths: initial?.postedMonths ?? [],
  };
  const calls: { method: string; arg?: unknown }[] = [];

  return {
    state,
    calls,
    async pull() {
      calls.push({ method: "pull" });
      return state;
    },
    async upsertEntry(e: Entry) {
      calls.push({ method: "upsertEntry", arg: e });
      const i = state.entries.findIndex((x) => x.id === e.id);
      if (i >= 0) state.entries[i] = e;
      else state.entries.push(e);
    },
    async deleteEntry(id: ID) {
      calls.push({ method: "deleteEntry", arg: id });
      state.entries = state.entries.filter((e) => e.id !== id);
    },
    async upsertRecurring(r: Recurring) {
      calls.push({ method: "upsertRecurring", arg: r });
    },
    async deleteRecurring(id: ID) {
      calls.push({ method: "deleteRecurring", arg: id });
    },
    async upsertCategory(c: Category) {
      calls.push({ method: "upsertCategory", arg: c });
    },
    async upsertAccount(a: Account) {
      calls.push({ method: "upsertAccount", arg: a });
    },
    async addSnapshot(s: Snapshot) {
      calls.push({ method: "addSnapshot", arg: s });
    },
    async markPosted(m: ISOMonth) {
      calls.push({ method: "markPosted", arg: m });
    },
    async migrate(snapshot: BackendSnapshot) {
      calls.push({ method: "migrate", arg: snapshot });
      Object.assign(state, snapshot);
    },
  };
}

describe("Backend injection seam", () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  afterEach(() => {
    setBackend(remoteBackend);
  });

  it("swapping the backend routes store mutations to the new adapter", async () => {
    const fake = makeFakeBackend({
      categories: [{ id: "c1", label: "Food", kind: "expense", archived: false }],
      accounts: [{ id: "a1", label: "Giro", kind: "giro", archived: false }],
    });
    setBackend(fake);

    await useStore.getState().hydrate();
    useStore.getState().addEntry({
      date: "2026-05-01",
      amount: -1234,
      categoryId: "c1",
      accountId: "a1",
      source: "manual",
      chapterId: "current",
    });

    // The fake captured the pull (during hydrate) and the upsertEntry from addEntry.
    expect(fake.calls.map((c) => c.method)).toEqual(["pull", "upsertEntry"]);
    expect(fake.state.entries).toHaveLength(1);
    expect(fake.state.entries[0].amount).toBe(-1234);
  });

  it("hydrate triggers backend.migrate with seed data when account is empty", async () => {
    const fake = makeFakeBackend(); // empty
    setBackend(fake);

    await useStore.getState().hydrate();

    const methods = fake.calls.map((c) => c.method);
    expect(methods.slice(0, 3)).toEqual(["pull", "migrate", "pull"]);
  });
});
