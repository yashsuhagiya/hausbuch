import { beforeEach, describe, expect, it } from "vitest";
import {
  commitImportPlan,
  parseSplitwiseCSV,
  planSplitwiseImport,
  type SplitwiseRow,
} from "@/lib/splitwise-import";
import { useStore } from "@/lib/store";
import type { Entry } from "@/lib/types";

const fixture = `Date,Description,Category,Cost,Currency,Alice,Yash Suhagiya,Bob

2024-05-06,Aldi,Groceries,19.60,EUR,0.00,-9.80,9.80
2024-05-06,"Lidl, Erlangen",Groceries,2.24,EUR,0.00,-1.12,1.12
2024-05-15,Norma,General,9.66,EUR,0.00,4.83,-4.83
2024-05-20,Yash S. paid Bob,Payment,5.00,EUR,0.00,5.00,-5.00
2024-05-21,Solo entry,General,3.00,EUR,3.00,0.00,-3.00
2024-06-01,Hotel,Hotel,100.00,USD,0.00,-50.00,-50.00

2024-06-30,Total balance, , ,EUR,0.00,0.00,0.00
`;

const opts = { userColumn: "Yash Suhagiya", accountId: "acc-giro" };

describe("parseSplitwiseCSV", () => {
  it("parses members from header", () => {
    const result = parseSplitwiseCSV(fixture);
    expect(result.members).toEqual(["Alice", "Yash Suhagiya", "Bob"]);
  });

  it("returns rows with split data", () => {
    const result = parseSplitwiseCSV(fixture);
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

describe("planSplitwiseImport — filter rules", () => {
  it("skips rows where user's column is zero", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    expect(plan.entries.find((e) => e.note === "Solo entry")).toBeUndefined();
    expect(plan.skipped.zero).toBeGreaterThanOrEqual(1);
  });

  it("skips Payment-category rows", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    expect(plan.entries.find((e) => e.note?.includes("paid"))).toBeUndefined();
    expect(plan.skipped.payment).toBeGreaterThanOrEqual(1);
  });

  it("skips non-EUR rows", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    expect(plan.entries.find((e) => e.note === "Hotel")).toBeUndefined();
    expect(plan.skipped.nonEur).toBeGreaterThanOrEqual(1);
  });
});

describe("planSplitwiseImport — sign", () => {
  it("negative user-column → negative entry amount (expense)", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    const aldi = plan.entries.find((e) => e.note === "Aldi");
    expect(aldi).toBeTruthy();
    expect(aldi?.amount).toBe(-980); // -9.80 EUR in cents
  });

  it("positive user-column rows are skipped as paid-for-others (not imported as income)", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    expect(plan.entries.find((e) => e.note === "Norma")).toBeUndefined();
    expect(plan.skipped.paidForOthers).toBeGreaterThanOrEqual(1);
  });
});

describe("planSplitwiseImport — category mapping", () => {
  it("maps Groceries → cat-groceries", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    const aldi = plan.entries.find((e) => e.note === "Aldi");
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
    const plan = planSplitwiseImport(customRows, opts, []);
    expect(plan.entries[0].categoryId).toBe("cat-other");
  });
});

describe("planSplitwiseImport — idempotency against existing entries", () => {
  it("re-planning against entries that already include the same hashes skips duplicates", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const first = planSplitwiseImport(rows, opts, []);

    // Simulate the first plan being committed: build pseudo-entries with the
    // same importHash values the next plan will compute.
    const existing: Entry[] = first.entries.map((e, i) => ({ ...e, id: `existing-${i}` }));

    const second = planSplitwiseImport(rows, opts, existing);
    expect(second.entries.length).toBe(0);
    expect(second.skipped.duplicate).toBe(first.entries.length);
  });
});

describe("commitImportPlan — store integration", () => {
  beforeEach(async () => {
    localStorage.clear();
    useStore.getState().reset();
    await useStore.getState().hydrate();
  });

  it("calls addEntry once per planned entry and returns the ids it created", () => {
    const { rows } = parseSplitwiseCSV(fixture);
    const plan = planSplitwiseImport(rows, opts, []);
    const result = commitImportPlan(plan, useStore.getState().addEntry);
    expect(result.imported.length).toBe(plan.entries.length);
    expect(result.imported.every((e) => typeof e.id === "string" && e.id.length > 0)).toBe(true);
  });
});
