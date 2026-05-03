// Domain helpers for Entry/Recurring shaping. Pure; no store or React deps.

import { currentMonth, todayISO } from "./date";
import { newId } from "./ids";
import type { Account, Category, Entry, ID, ISODate, Recurring } from "./types";

/**
 * Apply the sign convention: income categories are positive, expense
 * categories are negative. Callers pass the unsigned absolute amount in
 * cents; the sign comes from the resolved category.
 *
 * If the category is missing (deleted, not yet hydrated), defaults to
 * expense. UI should typically guard against missing-category state
 * before reaching here, but the default keeps things safe rather than
 * leaving an entry with the wrong sign.
 */
export function signAmount(absCents: number, category: Category | undefined): number {
  const sign = category?.kind === "income" ? 1 : -1;
  return absCents * sign;
}

interface BlankEntryDefaults {
  date?: ISODate;
  categoryId?: ID;
  accountId?: ID;
}

/**
 * Shape a fresh, unsaved Entry with sensible defaults: today's date,
 * zero amount, manual source, current chapter. Callers fill in amount
 * and (optionally) note via the form before persisting.
 */
export function createBlankEntry(
  categories: Category[],
  accounts: Account[],
  defaults: BlankEntryDefaults = {},
): Omit<Entry, "id"> {
  return {
    date: defaults.date ?? todayISO(),
    amount: 0,
    categoryId: defaults.categoryId ?? categories[0]?.id ?? "",
    accountId: defaults.accountId ?? accounts[0]?.id ?? "",
    source: "manual",
    chapterId: "current",
  };
}

/**
 * Shape a fresh, unsaved Recurring with sensible defaults: empty label,
 * zero amount, day-of-month 1, starting this month, no end month.
 * The id is generated upfront so the editor can treat the row as a
 * candidate identity from first render.
 */
export function createBlankRecurring(categories: Category[], accounts: Account[]): Recurring {
  return {
    id: newId(),
    label: "",
    amount: 0,
    categoryId: categories[0]?.id ?? "",
    accountId: accounts[0]?.id ?? "",
    dayOfMonth: 1,
    startMonth: currentMonth(),
  };
}
