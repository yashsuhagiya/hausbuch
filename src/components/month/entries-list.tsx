"use client";
import { Dot } from "@/components/ui/dot";
import { formatDateDE, todayISO } from "@/lib/date";
import { formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Entry, ISOMonth } from "@/lib/types";

// Projected entries are real Entry rows minus the id (computed at render time for future months).
// We model that as a separate type so we don't need `as any` casts.
export type ProjectedEntry = Omit<Entry, "id">;

interface Props {
  month: ISOMonth;
  onEdit?: (e: Entry) => void;
  projections?: ProjectedEntry[];
}

function isReal(e: Entry | ProjectedEntry): e is Entry {
  return "id" in e && typeof (e as Entry).id === "string";
}

export function EntriesList({ month, onEdit, projections = [] }: Props) {
  const stored = useStore((s) => s.entriesForMonth(month));
  const cats = useStore((s) => s.categories);
  const all: (Entry | ProjectedEntry)[] = [...stored, ...projections].sort((a, b) => b.date.localeCompare(a.date));
  const today = todayISO();

  if (all.length === 0) {
    return (
      <div>
        <SectionHead left="Entries" right="0 entries" />
        <p className="font-display italic text-sage py-6">No entries yet.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHead left="Entries" right={`${all.length} entries · • marks recurring`} />
      <ul>
        {all.map((e, i) => {
          const isToday = e.date === today;
          const cat = cats.find((c) => c.id === e.categoryId);
          const real = isReal(e);
          const projected = !real;
          const key = real ? e.id : `proj-${i}-${e.date}-${e.categoryId}`;
          const clickable = real && !!onEdit;
          const activate = () => {
            if (real && onEdit) onEdit(e);
          };
          return (
            <li
              key={key}
              className={`grid grid-cols-[60px_1fr_90px_110px] gap-4 items-baseline py-2 border-b border-dotted border-hairline relative ${
                isToday ? "bg-rust/5 -mx-4 px-4" : ""
              } ${clickable ? "cursor-pointer" : ""}`}
              onClick={clickable ? activate : undefined}
              onKeyDown={
                clickable
                  ? (ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        activate();
                      }
                    }
                  : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              {e.source === "recurring" && (
                <span className="absolute -left-2.5 top-3">
                  <Dot faded={projected} />
                </span>
              )}
              <span className={`font-mono text-sm ${isToday ? "text-rust" : "text-sage"}`}>
                {formatDateDE(e.date).slice(0, 5)}
              </span>
              <span>
                {cat?.label ?? "—"}
                {e.note && <small className="block text-sage italic text-xs mt-0.5">{e.note}</small>}
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-wide text-sage">{cat?.label}</span>
              <span className={`font-display text-right tnum ${e.amount > 0 ? "text-green" : "text-charcoal"}`}>
                {formatEUR(e.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SectionHead({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between items-baseline mt-9 mb-4">
      <span className="font-mono text-[0.65rem] tracking-widest uppercase text-sage">{left}</span>
      <span className="text-xs text-sage">{right}</span>
    </div>
  );
}
