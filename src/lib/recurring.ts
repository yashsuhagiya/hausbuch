import { entriesInMonth } from "./dashboard-stats";
import { clampDayOfMonth, currentMonth, monthRange } from "./date";
import { useStore } from "./store";
import type { Entry, ISOMonth, Recurring } from "./types";

function activeFor(r: Recurring, m: ISOMonth): boolean {
  if (m < r.startMonth) return false;
  if (r.endMonth && m >= r.endMonth) return false; // endMonth exclusive
  return true;
}

function entryFor(r: Recurring, m: ISOMonth): Omit<Entry, "id"> {
  const day = String(clampDayOfMonth(m, r.dayOfMonth)).padStart(2, "0");
  return {
    date: `${m}-${day}`,
    amount: r.amount,
    categoryId: r.categoryId,
    accountId: r.accountId,
    source: "recurring",
    recurringId: r.id,
    postedForMonth: m,
    chapterId: "current",
  };
}

export interface RecurringPlan {
  entries: Omit<Entry, "id">[];
  monthsToMark: ISOMonth[];
}

/**
 * Compute (but do not apply) the recurring postings needed to bring the
 * ledger up through `through`, given a snapshot of recurring rules,
 * already-posted months, and existing entries. Pure: no store, no I/O.
 *
 * Idempotency comes from two checks: months in `postedMonths` are skipped
 * outright, and within a still-open month, any entry already tagged with
 * the matching (recurringId, postedForMonth) is left alone.
 */
export function planRecurringThrough(
  recurring: Recurring[],
  postedMonths: ReadonlySet<ISOMonth>,
  entries: Entry[],
  through: ISOMonth,
): RecurringPlan {
  if (recurring.length === 0) return { entries: [], monthsToMark: [] };

  const earliest = [...recurring.map((r) => r.startMonth)].sort()[0];
  const months = monthRange(earliest, through);

  const planned: Omit<Entry, "id">[] = [];
  const monthsToMark: ISOMonth[] = [];
  // Track newly-planned (recurringId, month) pairs so a single plan call
  // can't double-post within itself, even before the store sees them.
  const planExisting = new Set<string>();
  const key = (recurringId: string, m: ISOMonth) => `${recurringId}|${m}`;

  for (const m of months) {
    if (postedMonths.has(m)) continue;
    const existing = entriesInMonth(entries, m);
    for (const r of recurring) {
      if (!activeFor(r, m)) continue;
      const k = key(r.id, m);
      const already = existing.some((e) => e.recurringId === r.id && e.postedForMonth === m);
      if (already || planExisting.has(k)) continue;
      planned.push(entryFor(r, m));
      planExisting.add(k);
    }
    monthsToMark.push(m);
  }

  return { entries: planned, monthsToMark };
}

/**
 * Post recurring entries through `through` (inclusive). Computes a plan
 * against the current store snapshot, then applies it via store mutators.
 * Idempotent: re-running with the same state produces an empty plan.
 */
export function postRecurringThrough(through: ISOMonth): void {
  const state = useStore.getState();
  const plan = planRecurringThrough(state.recurring, state.postedMonths, state.entries, through);
  for (const e of plan.entries) state.addEntry(e);
  for (const m of plan.monthsToMark) state.markPosted(m);
}

/** Compute virtual recurring entries for a (typically future) month. Does NOT write. */
export function projectRecurringFor(month: ISOMonth): Omit<Entry, "id">[] {
  const state = useStore.getState();
  if (state.postedMonths.has(month)) return [];
  return state.recurring.filter((r) => activeFor(r, month)).map((r) => entryFor(r, month));
}

/** Convenience for app boot: post everything through the current month. */
export function postRecurringForCurrent(): void {
  postRecurringThrough(currentMonth());
}
