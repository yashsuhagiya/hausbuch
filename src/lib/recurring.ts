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

/**
 * Post recurring entries for every month from earliest start through `through` (inclusive).
 * Idempotent: months already in `postedMonths` are skipped, and entries with
 * matching (recurringId, postedForMonth) are not re-created.
 */
export function postRecurringThrough(through: ISOMonth): void {
  const state = useStore.getState();
  const recs = state.recurring;
  if (recs.length === 0) return;

  const earliest = [...recs.map((r) => r.startMonth)].sort()[0];
  const months = monthRange(earliest, through);

  for (const m of months) {
    // Re-read fresh state each iteration so prior posts are visible.
    const live = useStore.getState();
    if (live.postedMonths.has(m)) continue;

    const existing = live.entriesForMonth(m);
    for (const r of recs) {
      if (!activeFor(r, m)) continue;
      const already = existing.some((e) => e.recurringId === r.id && e.postedForMonth === m);
      if (already) continue;
      live.addEntry(entryFor(r, m));
    }
    useStore.getState().markPosted(m);
  }
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
