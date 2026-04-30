import { beforeEach, describe, expect, it } from "vitest";
import { importSplitwiseRows, parseSplitwiseCSV, type SplitwiseRow } from "@/lib/splitwise-import";
import { useStore } from "@/lib/store";

const fixture = `Date,Description,Category,Cost,Currency,Alice,Yash Suhagiya,Bob

2024-05-06,Aldi,Groceries,19.60,EUR,0.00,-9.80,9.80
2024-05-06,"Lidl, Erlangen",Groceries,2.24,EUR,0.00,-1.12,1.12
2024-05-15,Norma,General,9.66,EUR,0.00,4.83,-4.83
2024-05-20,Yash S. paid Bob,Payment,5.00,EUR,0.00,5.00,-5.00
2024-05-21,Solo entry,General,3.00,EUR,3.00,0.00,-3.00
2024-06-01,Hotel,Hotel,100.00,USD,0.00,-50.00,-50.00

2024-06-30,Total balance, , ,EUR,0.00,0.00,0.00
`;

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.getState().hydrate();
});

describe("parseSplitwiseCSV", () => {
  it("parses members from header", () => {
    const result = parseSplitwiseCSV(fixture);
    expect(result.members).toEqual(["Alice", "Yash Suhagiya", "Bob"]);
  });

  it("returns rows with split data", () => {
    const result = parseSplitwiseCSV(fixture);
    // 6 data rows minus the Total balance footer = 6 rows kept (skip applies later, not in parse)
    expect(result.rows.length).toBeGreaterThanOrEqual(5);
    const aldi = result.rows.find((r) => r.description === "Aldi");
    expect(aldi).toBeTruthy();
    expect(aldi?.cost).toBe("19.60");
    expect(aldi?.shares["Yash Suhagiya"]).toBe("-9.80");
  });

  it("handles quoted descriptions with commas", () => {
    const result = parseSplitwiseCSV(fixture);
    const lidl = result.rows.find((r) => r.description === "Lidl, Erlangen");
    expect(lidl).toBeTruthy();
  });

  it("skips Total balance footer", () => {
    const result = parseSplitwiseCSV(fixture);
    expect(result.rows.find((r) => r.description === "Total balance")).toBeUndefined();
  });
});

describe("importSplitwiseRows — filter rules", () => {
  it("skips rows where user's column is zero", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    // "Solo entry" (yash=0.00) should be skipped
    expect(result.imported.find((e) => e.note === "Solo entry")).toBeUndefined();
    expect(result.skipped.zero).toBeGreaterThanOrEqual(1);
  });

  it("skips Payment-category rows", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    expect(result.imported.find((e) => e.note?.includes("paid"))).toBeUndefined();
    expect(result.skipped.payment).toBeGreaterThanOrEqual(1);
  });

  it("skips non-EUR rows", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    expect(result.imported.find((e) => e.note === "Hotel")).toBeUndefined();
    expect(result.skipped.nonEur).toBeGreaterThanOrEqual(1);
  });
});

describe("importSplitwiseRows — sign", () => {
  it("negative user-column → negative entry amount (expense)", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    const aldi = result.imported.find((e) => e.note === "Aldi");
    expect(aldi).toBeTruthy();
    expect(aldi?.amount).toBe(-980); // -9.80 EUR in cents
  });

  it("positive user-column → positive entry amount (income from overpayment)", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    const norma = result.imported.find((e) => e.note === "Norma");
    expect(norma?.amount).toBe(483); // +4.83 EUR in cents
  });
});

describe("importSplitwiseRows — category mapping", () => {
  it("maps Groceries → cat-groceries", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const result = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    const aldi = result.imported.find((e) => e.note === "Aldi");
    expect(aldi?.categoryId).toBe("cat-groceries");
  });

  it("falls back to cat-other for unknown category", () => {
    const customRows: SplitwiseRow[] = [
      {
        date: "2024-05-06",
        description: "Mystery",
        category: "Astrophysics",
        cost: "10.00",
        currency: "EUR",
        shares: { "Yash Suhagiya": "-5.00" },
      },
    ];
    const result = importSplitwiseRows(customRows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    expect(result.imported[0].categoryId).toBe("cat-other");
  });
});

describe("importSplitwiseRows — idempotency", () => {
  it("re-importing same rows does not duplicate", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const first = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    const second = importSplitwiseRows(rows, { userColumn: "Yash Suhagiya", accountId: "acc-giro" });
    expect(second.imported.length).toBe(0);
    expect(second.skipped.duplicate).toBe(first.imported.length);
  });
});
