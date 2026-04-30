import { daysInMonth } from "@/lib/date";
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

export function ClosingPanel({ month }: { month: ISOMonth }) {
  const [yStr, moStr] = month.split("-");
  const y = Number.parseInt(yStr, 10);
  const mo = Number.parseInt(moStr, 10);
  const last = daysInMonth(month);
  const lastStr = String(last).padStart(2, "0");
  const moStrPad = String(mo).padStart(2, "0");

  return (
    <section className="mt-12 py-6 border-t border-b border-hairline flex justify-between items-center gap-6">
      <span className="font-display italic text-sage">
        Monthly close — opens at {lastStr}.{moStrPad}.{y}. A short narrative summary of {MONTHS[mo - 1]} will be written
        here.
      </span>
      <span className="font-mono text-xs uppercase tracking-widest text-rust border border-rust px-3 py-1 whitespace-nowrap">
        Pending
      </span>
    </section>
  );
}
