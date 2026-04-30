import { describe, expect, it } from "vitest";
import {
  clampDayOfMonth,
  daysInMonth,
  formatDateDE,
  monthOf,
  monthRange,
  nextMonth,
  prevMonth,
  todayISO,
} from "@/lib/date";

describe("date helpers", () => {
  it("todayISO returns YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("monthOf strips day", () => {
    expect(monthOf("2026-04-22")).toBe("2026-04");
  });
  it("prev/nextMonth wrap year", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(nextMonth("2025-12")).toBe("2026-01");
  });
  it("daysInMonth handles Feb leap and non-leap", () => {
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2026-04")).toBe(30);
  });
  it("clampDayOfMonth clamps 31 in April to 30, in Feb to 28", () => {
    expect(clampDayOfMonth("2026-04", 31)).toBe(30);
    expect(clampDayOfMonth("2026-02", 31)).toBe(28);
    expect(clampDayOfMonth("2026-04", 15)).toBe(15);
  });
  it("monthRange enumerates inclusive", () => {
    expect(monthRange("2026-01", "2026-03")).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(monthRange("2026-03", "2026-01")).toEqual([]);
  });
  it("formatDateDE formats DD.MM.YYYY", () => {
    expect(formatDateDE("2026-04-22")).toBe("22.04.2026");
  });
});
