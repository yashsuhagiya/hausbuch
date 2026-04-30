"use client";
import Link from "next/link";
import { nextMonth, prevMonth } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { ISOMonth } from "@/lib/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function readableMonth(m: ISOMonth) {
  const [y, mo] = m.split("-").map((n) => Number.parseInt(n, 10));
  return `${MONTHS[mo - 1]} ${y}.`;
}

export function PageHead({ month }: { month: ISOMonth }) {
  const entries = useStore((s) => s.entries);
  const balance = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-end gap-3 md:gap-8 pb-4 border-b border-ink mb-8">
      <Link
        href={`/m/${prevMonth(month)}`}
        className="font-mono text-xs uppercase tracking-widest text-sage hover:text-ink whitespace-nowrap"
        aria-label={`Previous month, ${readableMonth(prevMonth(month))}`}
      >
        <span className="md:hidden">←</span>
        <span className="hidden md:inline">← {readableMonth(prevMonth(month))}</span>
      </Link>
      <div className="text-center min-w-0">
        <h1 className="font-display text-3xl md:text-5xl tracking-tight">{readableMonth(month)}</h1>
      </div>
      <div className="text-right">
        <Link
          href={`/m/${nextMonth(month)}`}
          className="font-mono text-[0.6rem] tracking-widest uppercase text-sage hover:text-ink block whitespace-nowrap"
          aria-label={`Next month, ${readableMonth(nextMonth(month))}`}
        >
          <span className="md:hidden">→</span>
          <span className="hidden md:inline">{readableMonth(nextMonth(month))} →</span>
        </Link>
        <div className="font-display text-base md:text-2xl tnum mt-1 whitespace-nowrap">{formatEUR(balance)}</div>
      </div>
    </header>
  );
}
