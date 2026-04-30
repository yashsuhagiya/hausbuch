"use client";
import { useMemo, useState } from "react";
import { EntrySheet } from "@/components/entry-sheet/sheet";
import { Breakdown } from "@/components/month/breakdown";
import { ClosingPanel } from "@/components/month/closing-panel";
import { EntriesList, type ProjectedEntry } from "@/components/month/entries-list";
import { Fab } from "@/components/month/fab";
import { FlowChart } from "@/components/month/flow-chart";
import { PageHead } from "@/components/month/page-head";
import { StatsStrip } from "@/components/month/stats-strip";
import { currentMonth, todayISO } from "@/lib/date";
import { projectRecurringFor } from "@/lib/recurring";
import { useStore } from "@/lib/store";
import type { Entry, ISODate, ISOMonth } from "@/lib/types";

function defaultDateFor(month: ISOMonth): ISODate {
  return month === currentMonth() ? todayISO() : `${month}-01`;
}

export function MonthPageShell({ month }: { month: ISOMonth }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | undefined>(undefined);

  // Projections only matter for future months; they recompute when recurring templates change.
  // The dependency on `recurring` is what makes this re-run when templates are added/edited
  // (projectRecurringFor reads live store state internally, so React can't infer the dep).
  const recurring = useStore((s) => s.recurring);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  const projections: ProjectedEntry[] = useMemo(() => {
    return month > currentMonth() ? projectRecurringFor(month) : [];
  }, [month, recurring]);

  const openNew = () => {
    setEditing(undefined);
    setOpen(true);
  };
  const openEdit = (e: Entry) => {
    setEditing(e);
    setOpen(true);
  };
  const close = () => setOpen(false);

  return (
    <main className="max-w-[1320px] mx-auto px-8 py-12">
      <PageHead month={month} />
      <StatsStrip month={month} />
      <FlowChart month={month} />
      <EntriesList month={month} onEdit={openEdit} projections={projections} />
      <Breakdown month={month} />
      <ClosingPanel month={month} />
      <Fab onClick={openNew} />
      <EntrySheet open={open} initial={editing} defaultDate={defaultDateFor(month)} onClose={close} />
    </main>
  );
}
