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
    <header className="grid grid-cols-[auto_1fr_auto] items-end gap-8 pb-4 border-b border-ink mb-8">
      <Link
        href={`/m/${prevMonth(month)}`}
        className="font-mono text-xs uppercase tracking-widest text-sage hover:text-ink"
      >
        ← {readableMonth(prevMonth(month))}
      </Link>
      <div className="text-center">
        <h1 className="font-display text-5xl tracking-tight">{readableMonth(month)}</h1>
      </div>
      <div className="text-right">
        <Link
          href={`/m/${nextMonth(month)}`}
          className="font-mono text-[0.6rem] tracking-widest uppercase text-sage hover:text-ink block"
        >
          {readableMonth(nextMonth(month))} →
        </Link>
        <div className="font-display text-2xl tnum mt-1">{formatEUR(balance)}</div>
      </div>
    </header>
  );
}
