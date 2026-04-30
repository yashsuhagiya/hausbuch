"use client";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { currentMonth, daysInMonth, todayISO } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

interface DayDatum {
  day: number;
  value: number;
}

export function FlowChart({ month }: { month: ISOMonth }) {
  const entries = useStore((s) => s.entriesForMonth(month));
  const total = daysInMonth(month);
  const data: DayDatum[] = Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const dayEntries = entries.filter((e) => Number.parseInt(e.date.slice(8, 10), 10) === day);
    const out = dayEntries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
    const inc = dayEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    // Show income (positive) when present; otherwise expenses (negative). Mixed days show net.
    const value = inc !== 0 || out !== 0 ? (inc + out) / 100 : 0;
    return { day, value };
  });

  const todayDay = month === currentMonth() ? Number.parseInt(todayISO().split("-")[2], 10) : null;
  const lastDay = total;
  const midA = Math.min(8, total);
  const midB = Math.min(15, total);
  const midC = todayDay ?? Math.min(22, total);

  return (
    <section className="mt-9">
      <header className="flex justify-between items-baseline mb-3">
        <span className="font-mono text-[0.65rem] tracking-widest uppercase text-sage">The flow of the month</span>
        <span className="text-xs text-sage">income above the line · expenses below</span>
      </header>
      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={2}>
            <Bar dataKey="value">
              {data.map((d) => {
                const fill =
                  d.value === 0
                    ? "transparent"
                    : d.day === todayDay
                      ? "var(--color-rust)"
                      : d.value > 0
                        ? "var(--color-green)"
                        : "var(--color-ink)";
                return <Cell key={d.day} fill={fill} />;
              })}
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
