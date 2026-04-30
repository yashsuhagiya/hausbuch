import { beforeEach, describe, expect, it } from "vitest";
import * as storage from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("entries", () => {
  it("addEntry assigns id and persists", () => {
    const e = storage.addEntry({
      date: "2026-04-22",
      amount: -6840,
      categoryId: "c1",
      accountId: "a1",
      source: "manual",
      chapterId: "current",
    });
    expect(e.id).toBeTruthy();
    const all = storage.getEntries();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(e);
  });

  it("getEntries(month) filters by month", () => {
    storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    storage.addEntry({
      date: "2026-03-10",
      amount: -200,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    expect(storage.getEntries("2026-04")).toHaveLength(1);
    expect(storage.getEntries("2026-03")).toHaveLength(1);
  });

  it("updateEntry merges patch", () => {
    const e = storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    storage.updateEntry(e.id, { note: "lunch" });
    expect(storage.getEntries()[0].note).toBe("lunch");
  });

  it("deleteEntry removes", () => {
    const e = storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    storage.deleteEntry(e.id);
    expect(storage.getEntries()).toHaveLength(0);
  });
});

describe("posted months", () => {
  it("isPosted defaults false; markPosted persists", () => {
    expect(storage.isPosted("2026-04")).toBe(false);
    storage.markPosted("2026-04");
    expect(storage.isPosted("2026-04")).toBe(true);
  });
});

describe("export / import", () => {
  it("round-trips data", () => {
    storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    const json = storage.exportAll();
    localStorage.clear();
    storage.importAll(json);
    expect(storage.getEntries()).toHaveLength(1);
  });

  it("rejects malformed JSON without overwriting", () => {
    storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    expect(() => storage.importAll("{not json")).toThrow();
    expect(storage.getEntries()).toHaveLength(1);
  });
});

describe("backup", () => {
  it("every write captures the previous full snapshot", () => {
    storage.addEntry({
      date: "2026-04-22",
      amount: -100,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    const backupBefore = storage.peekBackup();
    storage.addEntry({
      date: "2026-04-23",
      amount: -50,
      categoryId: "c",
      accountId: "a",
      source: "manual",
      chapterId: "current",
    });
    const backupAfter = storage.peekBackup();
    expect(backupAfter).not.toEqual(backupBefore);
    // backupAfter contains exactly the state before the second add — 1 entry
    expect(backupAfter.entries).toHaveLength(1);
  });
});
