import Link from "next/link";
import { MonthPageShell } from "@/components/month/page-shell";
import { currentMonth } from "@/lib/date";

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return (
      <main className="max-w-3xl mx-auto px-8 py-24 text-center">
        <h1 className="font-display text-4xl italic">Not a month.</h1>
        <p className="font-display italic text-sage mt-2">
          URLs look like <code className="font-mono">/m/2026-04</code>.
        </p>
        <Link
          href={`/m/${currentMonth()}`}
          className="inline-block mt-6 font-mono text-xs uppercase tracking-widest text-rust border border-rust px-3 py-1"
        >
          go to current month →
        </Link>
      </main>
    );
  }
  return <MonthPageShell month={month} />;
}
