"use client";
import { useMemo } from "react";
import { currentMonth, daysInMonth, monthOf, todayISO } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { computeStats, useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

export function StatsStrip({ month }: { month: ISOMonth }) {
  const allEntries = useStore((s) => s.entries);
  const entries = useMemo(() => allEntries.filter((e) => monthOf(e.date) === month), [allEntries, month]);
  const stats = useMemo(() => computeStats(entries), [entries]);

  const isCurrent = month === currentMonth();
  const todayDay = isCurrent ? Number.parseInt(todayISO().split("-")[2], 10) : daysInMonth(month);
  const remaining = Math.max(0, daysInMonth(month) - todayDay);
  const expensesSoFar = -stats.out;
  const dailyAvg = todayDay > 0 ? expensesSoFar / todayDay : 0;
  const projectedRemaining = dailyAvg * remaining;

  const expenseCount = entries.filter((e) => e.amount < 0).length;

  return (
    <div className="grid grid-cols-4 py-5 border-b border-hairline mb-8">
      <Cell label="In" value={stats.in} delta="this month" tone="pos" />
      <Cell label="Out" value={stats.out} delta={`${expenseCount} entries`} tone="neg" />
      <Cell label="Net" value={stats.net} delta="vs ledger" />
      <Cell
        label="Daily, remaining"
        value={Math.round(projectedRemaining)}
        delta={`${remaining} days to month-end`}
        last
      />
    </div>
  );
}

function Cell({
  label,
  value,
  delta,
  tone,
  last = false,
}: {
  label: string;
  value: number;
  delta: string;
  tone?: "pos" | "neg";
  last?: boolean;
}) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-charcoal" : "";
  return (
    <div className={`px-5 ${last ? "" : "border-r border-hairline"} first:pl-0`}>
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">{label}</div>
      <div className={`font-display text-2xl tnum ${toneClass}`}>{formatEUR(value)}</div>
      <div className="text-xs text-sage mt-1">{delta}</div>
    </div>
  );
}
