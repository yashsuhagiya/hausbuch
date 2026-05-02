// Pure aggregation helpers for the dashboard.
// Kept separate from store/components so they can be unit-tested without React.

import { monthOf, monthRange, prevMonth } from "./date";
import type { Category, Entry, ISOMonth } from "./types";

export interface MonthTotal {
  month: ISOMonth;
  income: number; // signed cents (positive)
  expense: number; // signed cents (negative)
  net: number; // signed cents
}

/**
 * Sum income and expense per month for the inclusive range [start..end].
 * Months with no entries return zeros so the chart axis stays continuous.
 */
export function totalsByMonth(entries: Entry[], start: ISOMonth, end: ISOMonth): MonthTotal[] {
  const months = monthRange(start, end);
  return months.map((month) => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (monthOf(e.date) !== month) continue;
      if (e.amount > 0) income += e.amount;
      else expense += e.amount;
    }
    return { month, income, expense, net: income + expense };
  });
}

/** Return the ISOMonth that's `n` months before `from` (inclusive of `from`'s month). */
export function monthsBefore(from: ISOMonth, n: number): ISOMonth {
  let m = from;
  for (let i = 0; i < n; i++) m = prevMonth(m);
  return m;
}

export interface CategoryTotal {
  categoryId: string;
  label: string;
  totalCents: number; // unsigned absolute spend
}

/**
 * Aggregate expense totals by category across the given entries, joined with
 * the live category list so labels stay fresh after a rename. Income entries
 * are skipped — the dashboard's "where it went" answers expense-only questions.
 */
export function topExpenseCategories(entries: Entry[], categories: Category[], limit: number): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.amount >= 0) continue;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + Math.abs(e.amount));
  }
  const labelById = new Map(categories.map((c) => [c.id, c.label]));
  return Array.from(totals.entries())
    .map(([categoryId, totalCents]) => ({
      categoryId,
      label: labelById.get(categoryId) ?? "Unknown",
      totalCents,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit);
}

/** Sum of all entries in [start..end] (inclusive months). */
export function sumIncome(entries: Entry[], start: ISOMonth, end: ISOMonth): number {
  return entries
    .filter((e) => {
      const m = monthOf(e.date);
      return m >= start && m <= end && e.amount > 0;
    })
    .reduce((s, e) => s + e.amount, 0);
}

export function sumExpense(entries: Entry[], start: ISOMonth, end: ISOMonth): number {
  return entries
    .filter((e) => {
      const m = monthOf(e.date);
      return m >= start && m <= end && e.amount < 0;
    })
    .reduce((s, e) => s + e.amount, 0);
}
