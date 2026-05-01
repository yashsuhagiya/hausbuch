// LocalBackend — wraps the existing localStorage-backed storage layer
// behind the async Backend interface so callers can be backend-agnostic.

import * as storage from "../storage";
import type { Backend, BackendSnapshot } from "./types";

export const localBackend: Backend = {
  async pull(): Promise<BackendSnapshot> {
    return {
      entries: storage.getEntries(),
      recurring: storage.getRecurring(),
      categories: storage.getCategories(),
      accounts: storage.getAccounts(),
      snapshots: storage.getSnapshots(),
      postedMonths: readPostedSync(),
    };
  },
};

function readPostedSync(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("hausbuch:posted-months") ?? "[]");
  } catch {
    return [];
  }
}
