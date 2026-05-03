"use client";
import { useMemo } from "react";
import { computeStats, entriesInMonth } from "@/lib/dashboard-stats";
import { currentMonth, daysInMonth, todayISO } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

export function StatsStrip({ month }: { month: ISOMonth }) {
  const allEntries = useStore((s) => s.entries);
  const entries = useMemo(() => entriesInMonth(allEntries, month), [allEntries, month]);
  const stats = useMemo(() => computeStats(entries), [entries]);

  const isCurrent = month === currentMonth();
  const todayDay = isCurrent ? Number.parseInt(todayISO().split("-")[2], 10) : daysInMonth(month);
  const remaining = Math.max(0, daysInMonth(month) - todayDay);
  const expensesSoFar = -stats.out;
  const dailyAvg = todayDay > 0 ? expensesSoFar / todayDay : 0;
  const projectedRemaining = dailyAvg * remaining;

  const expenseCount = entries.filter((e) => e.amount < 0).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 md:gap-y-0 py-5 border-b border-hairline mb-8">
      <Cell index={0} label="In" value={stats.in} delta="this month" tone="pos" />
      <Cell index={1} label="Out" value={stats.out} delta={`${expenseCount} entries`} tone="neg" />
      <Cell index={2} label="Net" value={stats.net} delta="vs ledger" />
      <Cell
        index={3}
        label="Daily, remaining"
        value={Math.round(projectedRemaining)}
        delta={`${remaining} days to month-end`}
      />
    </div>
  );
}

function Cell({
  index,
  label,
  value,
  delta,
  tone,
}: {
  index: number;
  label: string;
  value: number;
  delta: string;
  tone?: "pos" | "neg";
}) {
  const toneClass = tone === "pos" ? "text-green" : tone === "neg" ? "text-charcoal" : "";
  const isLast = index === 3;
  return (
    <div className={`px-3 md:px-5 ${isLast ? "" : "md:border-r md:border-hairline"} md:first:pl-0`}>
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">{label}</div>
      <div className={`font-display text-xl md:text-2xl tnum whitespace-nowrap ${toneClass}`}>{formatEUR(value)}</div>
      <div className="text-xs text-sage mt-1">{delta}</div>
    </div>
  );
}
