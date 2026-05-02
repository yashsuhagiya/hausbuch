"use client";
// 6-month bar chart — income above zero (green), expense below zero (ink),
// stackOffset="sign" so each month has one column with both halves anchored
// to the zero-line. Clicking a bar drills into that month.

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { monthsBefore, totalsByMonth } from "@/lib/dashboard-stats";
import { currentMonth } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ChartDatum {
  month: ISOMonth;
  shortLabel: string; // "May"
  income: number; // EUR
  expense: number; // EUR (negative)
  isCurrent: boolean;
}

export function MonthsBar() {
  const router = useRouter();
  const entries = useStore((s) => s.entries);

  const data: ChartDatum[] = useMemo(() => {
    const now = currentMonth();
    const start = monthsBefore(now, 5); // 6 months inclusive
    const totals = totalsByMonth(entries, start, now);
    return totals.map((t) => ({
      month: t.month,
      shortLabel: MONTHS_SHORT[Number.parseInt(t.month.slice(5, 7), 10) - 1],
      income: t.income / 100,
      expense: t.expense / 100,
      isCurrent: t.month === now,
    }));
  }, [entries]);

  return (
    <section className="mb-12">
      <header className="flex justify-between items-baseline mb-3">
        <h2 className="font-display italic text-xl">The last six months.</h2>
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage">tap a month to open</span>
      </header>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={12} stackOffset="sign">
            <ReferenceLine y={0} stroke="var(--color-ink)" strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "var(--color-rust)", fillOpacity: 0.05 }}
              contentStyle={{
                background: "var(--color-paper)",
                border: "1px solid var(--color-ink)",
                fontFamily: "var(--font-geist-mono)",
                fontSize: "0.7rem",
              }}
              formatter={(v) => formatEUR(Math.round(Number(v) * 100))}
            />
            <Bar dataKey="income" stackId="flow">
              {data.map((d) => (
                <Cell
                  key={`inc-${d.month}`}
                  fill={d.income === 0 ? "transparent" : d.isCurrent ? "var(--color-rust)" : "var(--color-green)"}
                />
              ))}
            </Bar>
            <Bar dataKey="expense" stackId="flow">
              {data.map((d) => (
                <Cell
                  key={`exp-${d.month}`}
                  fill={d.expense === 0 ? "transparent" : d.isCurrent ? "var(--color-rust)" : "var(--color-ink)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Month labels are the tap targets — bigger hit area than the bars
          themselves, especially on mobile where bar widths get narrow. */}
      <div className="grid grid-cols-6 font-mono text-[0.6rem] uppercase tracking-widest pt-2 border-t border-hairline">
        {data.map((d) => (
          <button
            key={d.month}
            type="button"
            onClick={() => router.push(`/m/${d.month}`)}
            className={`text-center py-2 hover:text-ink ${d.isCurrent ? "text-rust" : "text-sage"}`}
            aria-label={`Open ${d.shortLabel} ${d.month.slice(0, 4)}`}
          >
            {d.shortLabel}
          </button>
        ))}
      </div>
    </section>
  );
}
