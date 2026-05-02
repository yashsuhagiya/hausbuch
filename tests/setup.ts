import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@/lib/sync-actions", () => ({
  pullSnapshot: async () => ({
    entries: [],
    recurring: [],
    categories: [],
    accounts: [],
    snapshots: [],
    postedMonths: [],
  }),
  upsertEntryAction: async () => {},
  deleteEntryAction: async () => {},
  upsertRecurringAction: async () => {},
  deleteRecurringAction: async () => {},
  upsertCategoryAction: async () => {},
  upsertAccountAction: async () => {},
  addSnapshotAction: async () => {},
  markPostedAction: async () => {},
  migrateFromLocalAction: async () => {},
}));
