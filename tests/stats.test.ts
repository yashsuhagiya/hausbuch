import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/store";

const e = (amount: number) => ({
  id: "x",
  date: "2026-04-01",
  amount,
  categoryId: "c",
  accountId: "a",
  source: "manual" as const,
  chapterId: "current",
});

describe("computeStats", () => {
  it("splits in vs out and computes net", () => {
    const s = computeStats([e(320000), e(-62000), e(-15000)]);
    expect(s.in).toBe(320000);
    expect(s.out).toBe(-77000);
    expect(s.net).toBe(243000);
  });

  it("returns zeros for empty list", () => {
    expect(computeStats([])).toEqual({ in: 0, out: 0, net: 0 });
  });
});
