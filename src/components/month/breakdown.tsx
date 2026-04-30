"use client";
import { useMemo } from "react";
import { monthOf } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

interface BreakdownRow {
  id: string;
  label: string;
  total: number; // negative cents
  count: number;
}

export function Breakdown({ month }: { month: ISOMonth }) {
  const allEntries = useStore((s) => s.entries);
  const cats = useStore((s) => s.categories);

  const rows: BreakdownRow[] = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>();
    for (const e of allEntries) {
      if (monthOf(e.date) !== month) continue;
      if (e.amount >= 0) continue;
      const cur = totals.get(e.categoryId) ?? { total: 0, count: 0 };
      totals.set(e.categoryId, { total: cur.total + e.amount, count: cur.count + 1 });
    }
    const out: BreakdownRow[] = [];
    for (const [id, v] of totals) {
      out.push({
        id,
        label: cats.find((c) => c.id === id)?.label ?? "?",
        total: v.total,
        count: v.count,
      });
    }
    out.sort((a, b) => a.total - b.total); // most-negative (largest expense) first
    return out;
  }, [allEntries, cats, month]);

  if (rows.length === 0) return null;

  // For opacity scaling: largest absolute expense = opacity 1.0, scale others to min 0.18.
  const max = Math.min(...rows.map((r) => r.total)); // most negative

  return (
    <section className="mt-9">
      <header className="flex justify-between items-baseline mb-4">
        <span className="font-mono text-[0.65rem] tracking-widest uppercase text-sage">Where it went</span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {rows.map((r) => {
          const opacity = max === 0 ? 0 : Math.max(0.18, r.total / max);
          return (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_60px_80px] gap-3 items-center py-2 border-b border-dotted border-hairline"
            >
              <span className="text-sm">
                {r.label}
                <small className="font-mono text-[0.6rem] tracking-wide uppercase text-sage ml-2">
                  {r.count} entr{r.count === 1 ? "y" : "ies"}
                </small>
              </span>
              <span className="h-1 bg-ink" style={{ opacity }} />
              <span className="font-display tnum text-right text-sm text-charcoal">{formatEUR(r.total)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
