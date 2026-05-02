"use client";
// Hero block — Year-to-date numbers in the brand's typographic vocabulary.
// In · Out · Net are the same trio the month page uses, which keeps the
// mental model consistent: zoom out to the year, same shape of answer.

import { useMemo } from "react";
import { sumExpense, sumIncome } from "@/lib/dashboard-stats";
import { currentMonth } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";

export function DashboardHero() {
  const entries = useStore((s) => s.entries);

  const ytd = useMemo(() => {
    const now = currentMonth();
    const yearStart = `${now.slice(0, 4)}-01`;
    const monthsElapsed = Number.parseInt(now.slice(5, 7), 10); // 1..12
    const income = sumIncome(entries, yearStart, now);
    const expense = sumExpense(entries, yearStart, now);
    const net = income + expense;
    const avgMonthly = monthsElapsed > 0 ? Math.round(net / monthsElapsed) : 0;
    return { income, expense, net, avgMonthly, year: now.slice(0, 4) };
  }, [entries]);

  return (
    <section className="mb-12">
      <div className="font-mono text-[0.6rem] uppercase tracking-widest text-sage mb-2">Year to date · {ytd.year}</div>
      <div className="grid grid-cols-3 gap-y-4 gap-x-3 md:gap-x-8 pb-6 border-b border-hairline">
        <Cell label="In" value={ytd.income} tone="pos" />
        <Cell label="Out" value={ytd.expense} tone="neg" />
        <Cell
          label="Net"
          value={ytd.net}
          tone={ytd.net >= 0 ? "pos" : "neg"}
          delta={`avg/mo ${formatEUR(ytd.avgMonthly)}`}
        />
      </div>
    </section>
  );
}

function Cell({ label, value, tone, delta }: { label: string; value: number; tone?: "pos" | "neg"; delta?: string }) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-charcoal" : "";
  return (
    <div>
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">{label}</div>
      <div className={`font-display italic text-2xl md:text-4xl tnum whitespace-nowrap ${toneClass}`}>
        {formatEUR(value)}
      </div>
      {delta && <div className="font-mono text-[0.65rem] text-sage mt-1 whitespace-nowrap">{delta}</div>}
    </div>
  );
}
