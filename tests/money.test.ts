import { describe, it, expect } from "vitest";
import { decimalToCents, centsToDecimal, formatEUR } from "@/lib/money";

describe("decimalToCents", () => {
  it("rounds to nearest cent", () => {
    expect(decimalToCents(12.40)).toBe(1240);
    expect(decimalToCents(12.405)).toBe(1241);  // banker's not required; round-half-up
    expect(decimalToCents(0.1 + 0.2)).toBe(30); // float-safe
    expect(decimalToCents(-7.5)).toBe(-750);
  });
});

describe("centsToDecimal", () => {
  it("inverts decimalToCents", () => {
    expect(centsToDecimal(1240)).toBe(12.40);
    expect(centsToDecimal(-750)).toBe(-7.5);
  });
});

describe("formatEUR (de-DE)", () => {
  it("formats positive cents as 1.234,56 €", () => {
    expect(formatEUR(123456)).toBe("1.234,56 €");
  });
  it("formats negative with minus sign", () => {
    expect(formatEUR(-4732)).toBe("-47,32 €");
  });
  it("formats zero", () => {
    expect(formatEUR(0)).toBe("0,00 €");
  });
});
