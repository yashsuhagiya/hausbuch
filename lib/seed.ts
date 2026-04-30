import type { Account, Category } from "./types";

export const SEED_CATEGORIES: Category[] = [
  { id: "cat-income", label: "Income", kind: "income", archived: false },
  { id: "cat-housing", label: "Housing", kind: "expense", archived: false },
  { id: "cat-groceries", label: "Groceries", kind: "expense", archived: false },
  { id: "cat-dining", label: "Dining", kind: "expense", archived: false },
  { id: "cat-cafe", label: "Cafe", kind: "expense", archived: false },
  { id: "cat-transit", label: "Transit", kind: "expense", archived: false },
  { id: "cat-utilities", label: "Utilities", kind: "expense", archived: false },
  { id: "cat-subs", label: "Subscriptions", kind: "expense", archived: false },
  { id: "cat-other", label: "Other", kind: "expense", archived: false },
];

export const SEED_ACCOUNTS: Account[] = [{ id: "acc-giro", label: "Giro", kind: "giro", archived: false }];
