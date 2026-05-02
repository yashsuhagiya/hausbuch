"use client";
// Last N entries across all months — date · category · note · amount.
// Each row links to the month page so you can see the entry in context.

import Link from "next/link";
import { useMemo } from "react";
import { formatDateDE, monthOf } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";

const SHOW = 8;

export function RecentActivity() {
  const entries = useStore((s) => s.entries);
  const categories = useStore((s) => s.categories);

  const recent = useMemo(() => {
    const labelById = new Map(categories.map((c) => [c.id, c.label]));
    return [...entries]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, SHOW)
      .map((e) => ({
        ...e,
        categoryLabel: labelById.get(e.categoryId) ?? "Unknown",
      }));
  }, [entries, categories]);

  if (recent.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="font-display italic text-xl mb-4">Recent.</h2>
        <p className="font-display italic text-sage">Nothing yet — open a month and add your first entry.</p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="font-display italic text-xl mb-4">Recent.</h2>
      <ul className="divide-y divide-hairline border-y border-hairline">
        {recent.map((e) => (
          <li key={e.id}>
            <Link
              href={`/m/${monthOf(e.date)}`}
              className="grid grid-cols-[6rem_1fr_auto] items-baseline gap-3 py-2.5 hover:bg-rust/5"
            >
              <span className="font-mono text-[0.65rem] tracking-wide text-sage">{formatDateDE(e.date)}</span>
              <span className="min-w-0">
                <span className="font-display text-sm md:text-base">{e.categoryLabel}</span>
                {e.note && <span className="text-sage text-xs md:text-sm ml-2 truncate">· {e.note}</span>}
              </span>
              <span
                className={`font-mono text-xs md:text-sm tnum whitespace-nowrap ${
                  e.amount > 0 ? "text-green" : "text-charcoal"
                }`}
              >
                {formatEUR(e.amount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
