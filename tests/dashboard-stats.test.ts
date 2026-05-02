import { describe, expect, it } from "vitest";
import { monthsBefore, sumExpense, sumIncome, topExpenseCategories, totalsByMonth } from "@/lib/dashboard-stats";
import type { Category, Entry } from "@/lib/types";

const entry = (overrides: Partial<Entry>): Entry => ({
  id: "e",
  date: "2026-05-01",
  amount: -1000,
  categoryId: "cat-other",
  accountId: "acc-giro",
  source: "manual",
  chapterId: "current",
  ...overrides,
});

const cats: Category[] = [
  { id: "cat-groceries", label: "Groceries", kind: "expense", archived: false },
  { id: "cat-rent", label: "Rent", kind: "expense", archived: false },
  { id: "cat-other", label: "Other", kind: "expense", archived: false },
  { id: "cat-salary", label: "Salary", kind: "income", archived: false },
];

describe("totalsByMonth", () => {
  it("zero-fills months with no entries so the axis is continuous", () => {
    const totals = totalsByMonth([], "2026-01", "2026-03");
    expect(totals.map((t) => t.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(totals.every((t) => t.income === 0 && t.expense === 0)).toBe(true);
  });

  it("splits income vs expense by sign", () => {
    const entries = [
      entry({ date: "2026-01-15", amount: 271558 }), // income
      entry({ date: "2026-01-20", amount: -4280 }), // expense
      entry({ date: "2026-01-22", amount: -1500 }), // expense
    ];
    const [jan] = totalsByMonth(entries, "2026-01", "2026-01");
    expect(jan.income).toBe(271558);
    expect(jan.expense).toBe(-5780);
    expect(jan.net).toBe(265778);
  });
});

describe("monthsBefore", () => {
  it("walks back across year boundaries", () => {
    expect(monthsBefore("2026-02", 5)).toBe("2025-09");
  });
  it("zero is identity", () => {
    expect(monthsBefore("2026-05", 0)).toBe("2026-05");
  });
});

describe("topExpenseCategories", () => {
  it("ignores income, sorts by absolute total, applies limit", () => {
    const entries = [
      entry({ amount: -50000, categoryId: "cat-rent" }),
      entry({ amount: -8000, categoryId: "cat-groceries" }),
      entry({ amount: -2000, categoryId: "cat-groceries" }),
      entry({ amount: 100000, categoryId: "cat-salary" }), // ignored
      entry({ amount: -500, categoryId: "cat-other" }),
    ];
    const top = topExpenseCategories(entries, cats, 2);
    expect(top.map((c) => c.label)).toEqual(["Rent", "Groceries"]);
    expect(top[1].totalCents).toBe(10000); // 8000 + 2000
  });

  it("falls back to 'Unknown' for orphaned category ids", () => {
    const entries = [entry({ amount: -100, categoryId: "cat-deleted" })];
    const top = topExpenseCategories(entries, cats, 5);
    expect(top[0].label).toBe("Unknown");
  });
});

describe("sumIncome / sumExpense", () => {
  it("filters by month range inclusively", () => {
    const entries = [
      entry({ date: "2025-12-30", amount: 100 }), // out of range
      entry({ date: "2026-01-15", amount: 1000 }), // in range
      entry({ date: "2026-03-01", amount: 500 }), // in range
      entry({ date: "2026-04-01", amount: 200 }), // out of range
      entry({ date: "2026-02-10", amount: -300 }), // expense
    ];
    expect(sumIncome(entries, "2026-01", "2026-03")).toBe(1500);
    expect(sumExpense(entries, "2026-01", "2026-03")).toBe(-300);
  });
});
