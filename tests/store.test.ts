import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe("store", () => {
  it("hydrates with seed data on first run", async () => {
    await useStore.getState().hydrate();
    expect(useStore.getState().categories.length).toBeGreaterThan(0);
    expect(useStore.getState().accounts).toHaveLength(1);
  });

  it("addEntry round-trips through localStorage", async () => {
    await useStore.getState().hydrate();
    const e = useStore.getState().addEntry({
      date: "2026-04-22",
      amount: -6840,
      categoryId: "cat-dining",
      accountId: "acc-giro",
      source: "manual",
      chapterId: "current",
    });
    expect(useStore.getState().entries.find((x) => x.id === e.id)).toBeTruthy();
  });

  it("entriesForMonth filters", async () => {
    await useStore.getState().hydrate();
    useStore.getState().addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "cat-other",
      accountId: "acc-giro",
      source: "manual",
      chapterId: "current",
    });
    useStore.getState().addEntry({
      date: "2026-03-10",
      amount: -200,
      categoryId: "cat-other",
      accountId: "acc-giro",
      source: "manual",
      chapterId: "current",
    });
    expect(useStore.getState().entriesForMonth("2026-04")).toHaveLength(1);
  });
});
