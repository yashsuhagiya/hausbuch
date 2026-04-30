import type { ISODate, ISOMonth } from "./types";

export function todayISO(): ISODate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentMonth(): ISOMonth {
  return monthOf(todayISO());
}

export function monthOf(date: ISODate): ISOMonth {
  return date.slice(0, 7);
}

function parseMonth(m: ISOMonth): [number, number] {
  return [parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10)];
}

function fmtMonth(y: number, m: number): ISOMonth {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function prevMonth(m: ISOMonth): ISOMonth {
  const [y, mo] = parseMonth(m);
  return mo === 1 ? fmtMonth(y - 1, 12) : fmtMonth(y, mo - 1);
}

export function nextMonth(m: ISOMonth): ISOMonth {
  const [y, mo] = parseMonth(m);
  return mo === 12 ? fmtMonth(y + 1, 1) : fmtMonth(y, mo + 1);
}

export function daysInMonth(m: ISOMonth): number {
  const [y, mo] = parseMonth(m);
  return new Date(y, mo, 0).getDate();
}

export function clampDayOfMonth(m: ISOMonth, day: number): number {
  return Math.min(day, daysInMonth(m));
}

export function monthRange(start: ISOMonth, end: ISOMonth): ISOMonth[] {
  if (start > end) return [];
  const out: ISOMonth[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = nextMonth(cur);
  }
  return out;
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export function formatDateDE(date: ISODate): string {
  const [y, m, d] = date.split("-").map((n) => parseInt(n, 10));
  return dateFormatter.format(new Date(y, m - 1, d));
}
