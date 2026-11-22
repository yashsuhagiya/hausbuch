"use client";
import { useMemo } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer } from "recharts";
import { currentMonth, daysInMonth, monthOf, todayISO } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

interface DayDatum {
  day: number;
  income: number; // EUR, positive (above zero)
  expense: number; // EUR, negative (below zero)
}

export function FlowChart({ month }: { month: ISOMonth }) {
  const allEntries = useStore((s) => s.entries);
  const total = daysInMonth(month);
  const data: DayDatum[] = useMemo(() => {
    const entries = allEntries.filter((e) => monthOf(e.date) === month);
    return Array.from({ length: total }, (_, i) => {
      const day = i + 1;
      const dayEntries = entries.filter((e) => Number.parseInt(e.date.slice(8, 10), 10) === day);
      const expense = dayEntries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0) / 100;
      const income = dayEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0) / 100;
      return { day, income, expense };
    });
  }, [allEntries, month, total]);

  const todayDay = month === currentMonth() ? Number.parseInt(todayISO().split("-")[2], 10) : null;
  const lastDay = total;
  const midA = Math.min(8, total);
  const midB = Math.min(15, total);
  const midC = todayDay ?? Math.min(22, total);

  const incomeColor = (day: number) => (day === todayDay ? "var(--color-rust)" : "var(--color-green)");
  const expenseColor = (day: number) => (day === todayDay ? "var(--color-rust)" : "var(--color-ink)");

  return (
    <section className="mt-9">
      <header className="flex flex-col gap-1 md:flex-row md:justify-between md:items-baseline mb-3">
        <span className="font-mono text-[0.65rem] tracking-widest uppercase text-sage">The flow of the month</span>
        <span className="text-xs text-sage">income above the line · expenses below</span>
      </header>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={2} stackOffset="sign">
            <ReferenceLine y={0} stroke="var(--color-hairline)" />
            <Bar dataKey="income" stackId="flow">
              {data.map((d) => (
                <Cell key={`inc-${d.day}`} fill={d.income === 0 ? "transparent" : incomeColor(d.day)} />
              ))}
            </Bar>
            <Bar dataKey="expense" stackId="flow">
              {data.map((d) => (
                <Cell key={`exp-${d.day}`} fill={d.expense === 0 ? "transparent" : expenseColor(d.day)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between font-mono text-[0.55rem] tracking-wide text-sage pt-1 border-t border-hairline">
        <span>01</span>
        <span>{String(midA).padStart(2, "0")}</span>
        <span>{String(midB).padStart(2, "0")}</span>
        <span>{todayDay ? `${String(midC).padStart(2, "0")} · today` : String(midC).padStart(2, "0")}</span>
        <span>{String(lastDay).padStart(2, "0")}</span>
      </div>
    </section>
  );
}
