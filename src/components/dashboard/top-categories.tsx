"use client";
// Top expense categories over the trailing window (default 3 months). Each
// row is a horizontal bar whose width is proportional to the largest in the
// list — gives a sense of "how much rent vs how much groceries" without
// putting numbers in your face.

import { useMemo } from "react";
import { monthsBefore, topExpenseCategories } from "@/lib/dashboard-stats";
import { currentMonth, monthOf } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";

const TRAILING_MONTHS = 3;
const SHOW_TOP_N = 6;

export function TopCategories() {
  const entries = useStore((s) => s.entries);
  const categories = useStore((s) => s.categories);

  const top = useMemo(() => {
    const now = currentMonth();
    const start = monthsBefore(now, TRAILING_MONTHS - 1);
    const window = entries.filter((e) => {
      const m = monthOf(e.date);
      return m >= start && m <= now;
    });
    return topExpenseCategories(window, categories, SHOW_TOP_N);
  }, [entries, categories]);

  const max = top[0]?.totalCents ?? 0;
  if (top.length === 0) return null;

  return (
    <section className="mb-12">
      <header className="flex justify-between items-baseline mb-4">
        <h2 className="font-display italic text-xl">Where it went.</h2>
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage">
          last {TRAILING_MONTHS} months
        </span>
      </header>
      <ul className="space-y-2.5">
        {top.map((row) => {
          const pct = max === 0 ? 0 : (row.totalCents / max) * 100;
          return (
            <li key={row.categoryId} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 md:gap-4">
              <span className="font-display text-sm md:text-base truncate">{row.label}</span>
              <span className="relative h-2 bg-hairline overflow-hidden">
                <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
              </span>
              <span className="font-mono text-xs tnum text-charcoal whitespace-nowrap">
                {formatEUR(row.totalCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
