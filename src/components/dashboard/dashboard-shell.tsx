"use client";
// Top-level dashboard. Lives at `/`, replacing the old current-month
// redirect. The month page is one tap away (header link, six-month-bar
// click, recent-activity row click) so the user can drill in fast.

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentMonth } from "@/lib/date";
import { DashboardHero } from "./hero";
import { MonthsBar } from "./months-bar";
import { RecentActivity } from "./recent-activity";
import { TopCategories } from "./top-categories";

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

function readableMonth(m: string) {
  const [y, mo] = m.split("-").map((n) => Number.parseInt(n, 10));
  return `${MONTHS[mo - 1]} ${y}`;
}

export function DashboardShell() {
  // Defer all time-and-store-dependent rendering until after mount.
  // Without this, the route's pre-rendered HTML (built with `currentMonth()`
  // frozen at build time, plus empty store defaults) disagrees with the
  // client's first render — React #418 hydration mismatch. Server emits
  // only the masthead skeleton; the client fills in the live view.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="max-w-[1320px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <header className="grid grid-cols-[1fr_auto] items-baseline gap-3 pb-4 border-b border-ink mb-10">
        <h1 className="font-display text-3xl md:text-5xl tracking-tight">Hausbuch.</h1>
        {mounted && (
          <Link
            href={`/m/${currentMonth()}`}
            className="font-mono text-[0.6rem] md:text-xs tracking-widest uppercase text-sage hover:text-ink whitespace-nowrap"
          >
            {readableMonth(currentMonth())} →
          </Link>
        )}
      </header>

      {mounted && (
        <>
          <DashboardHero />
          <MonthsBar />
          <TopCategories />
          <RecentActivity />
        </>
      )}

      <Link
        href="/settings"
        title="Settings"
        aria-label="Settings"
        className="fixed bottom-8 right-8 w-10 h-10 bg-paper border border-ink text-ink font-mono text-[0.6rem] uppercase tracking-widest flex items-center justify-center shadow hover:bg-ink hover:text-paper transition-colors"
      >
        SET
      </Link>
    </main>
  );
}
