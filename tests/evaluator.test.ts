import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/evaluator";

describe("evaluate", () => {
  it("parses integers and decimals", () => {
    expect(evaluate("42")).toEqual({ ok: true, value: 42 });
    expect(evaluate("12.40")).toEqual({ ok: true, value: 12.4 });
  });
  it("does the example from the spec", () => {
    expect(evaluate("12.40 + 8.30 + 5.50")).toEqual({ ok: true, value: 26.2 });
  });
  it("respects precedence", () => {
    expect(evaluate("2 + 3 * 4")).toEqual({ ok: true, value: 14 });
    expect(evaluate("(2 + 3) * 4")).toEqual({ ok: true, value: 20 });
  });
  it("supports unary minus", () => {
    expect(evaluate("-5 + 3")).toEqual({ ok: true, value: -2 });
  });
  it("rejects empty", () => {
    expect(evaluate("").ok).toBe(false);
    expect(evaluate("   ").ok).toBe(false);
  });
  it("rejects non-numeric input", () => {
    expect(evaluate("hello").ok).toBe(false);
    expect(evaluate("2 + ").ok).toBe(false);
    expect(evaluate("2 ** 3").ok).toBe(false);
  });
  it("rejects division by zero", () => {
    expect(evaluate("1 / 0").ok).toBe(false);
  });
  it("ignores whitespace", () => {
    expect(evaluate("  1   +   2  ")).toEqual({ ok: true, value: 3 });
  });
});
