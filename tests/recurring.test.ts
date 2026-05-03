import { beforeEach, describe, expect, it } from "vitest";
import { entriesInMonth } from "@/lib/dashboard-stats";
import { planRecurringThrough, postRecurringThrough, projectRecurringFor } from "@/lib/recurring";
import { useStore } from "@/lib/store";
import type { Entry, Recurring } from "@/lib/types";

beforeEach(() => {
  useStore.getState().reset();
});

const rent: Recurring = {
  id: "r-rent",
  label: "Rent",
  amount: -62000,
  categoryId: "cat-housing",
  accountId: "acc-giro",
  dayOfMonth: 1,
  startMonth: "2026-01",
};

describe("postRecurringThrough", () => {
  it("posts an entry per month inclusive", () => {
    useStore.getState().upsertRecurring(rent);
    postRecurringThrough("2026-03");
    expect(entriesInMonth(useStore.getState().entries, "2026-01")).toHaveLength(1);
    expect(entriesInMonth(useStore.getState().entries, "2026-02")).toHaveLength(1);
    expect(entriesInMonth(useStore.getState().entries, "2026-03")).toHaveLength(1);
    expect(entriesInMonth(useStore.getState().entries, "2026-04")).toHaveLength(0);
  });

  it("is idempotent — running twice does not duplicate", () => {
    useStore.getState().upsertRecurring(rent);
    postRecurringThrough("2026-03");
    postRecurringThrough("2026-03");
    expect(entriesInMonth(useStore.getState().entries, "2026-02")).toHaveLength(1);
  });

  it("respects endMonth (exclusive)", () => {
    useStore.getState().upsertRecurring({ ...rent, endMonth: "2026-03" });
    postRecurringThrough("2026-04");
    expect(entriesInMonth(useStore.getState().entries, "2026-03")).toHaveLength(0); // endMonth exclusive
    expect(entriesInMonth(useStore.getState().entries, "2026-02")).toHaveLength(1);
    expect(entriesInMonth(useStore.getState().entries, "2026-01")).toHaveLength(1);
  });

  it("clamps day 31 to month end (Feb non-leap = 28)", () => {
    useStore.getState().upsertRecurring({ ...rent, id: "r2", dayOfMonth: 31 });
    postRecurringThrough("2026-02");
    const e = entriesInMonth(useStore.getState().entries, "2026-02").find((x) => x.recurringId === "r2");
    expect(e).toBeTruthy();
    expect(e?.date).toBe("2026-02-28");
  });
});

describe("planRecurringThrough (pure)", () => {
  it("plans one entry per month inclusive", () => {
    const plan = planRecurringThrough([rent], new Set(), [], "2026-03");
    expect(plan.entries).toHaveLength(3);
    expect(plan.monthsToMark).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("skips months already in postedMonths", () => {
    const plan = planRecurringThrough([rent], new Set(["2026-02"]), [], "2026-03");
    expect(plan.entries).toHaveLength(2);
    expect(plan.monthsToMark).toEqual(["2026-01", "2026-03"]);
  });

  it("skips entries already posted within an open month", () => {
    const existing: Entry[] = [
      {
        id: "e-feb",
        date: "2026-02-01",
        amount: -62000,
        categoryId: "cat-housing",
        accountId: "acc-giro",
        source: "recurring",
        recurringId: "r-rent",
        postedForMonth: "2026-02",
        chapterId: "current",
      },
    ];
    const plan = planRecurringThrough([rent], new Set(), existing, "2026-03");
    expect(plan.entries).toHaveLength(2);
    expect(plan.entries.map((e) => e.postedForMonth)).toEqual(["2026-01", "2026-03"]);
    expect(plan.monthsToMark).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("returns empty plan when no recurring rules exist", () => {
    const plan = planRecurringThrough([], new Set(), [], "2026-12");
    expect(plan.entries).toEqual([]);
    expect(plan.monthsToMark).toEqual([]);
  });
});

describe("projectRecurringFor (future months)", () => {
  it("returns virtual entries (no id) for an unposted future month", () => {
    useStore.getState().upsertRecurring(rent);
    const projected = projectRecurringFor("2099-06");
    expect(projected).toHaveLength(1);
    expect("id" in projected[0]).toBe(false);
    expect(projected[0].date).toBe("2099-06-01");
  });

  it("does not write to storage", () => {
    useStore.getState().upsertRecurring(rent);
    projectRecurringFor("2099-06");
    expect(entriesInMonth(useStore.getState().entries, "2099-06")).toHaveLength(0);
  });

  it("returns empty for a posted month (no need to project)", () => {
    useStore.getState().upsertRecurring(rent);
    postRecurringThrough("2026-04");
    const projected = projectRecurringFor("2026-04");
    expect(projected).toHaveLength(0);
  });
});
