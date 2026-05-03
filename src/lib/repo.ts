// Database repository — translates between Prisma rows and domain types.
// Server actions delegate here so each action stays a 3-line auth+delegate
// wrapper, and so the row ↔ domain mapping has one home rather than being
// duplicated across upsert paths.
//
// All functions take an explicit `userId` so authentication concerns live
// in the action layer, not here. Tests can call this module against a
// test database without going through Better Auth.

import type { BackendSnapshot } from "./backend/types";
import { prisma } from "./db";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "./types";

// --- Row → domain mappers (Prisma rows carry userId + timestamps the
// domain types don't expose; mappers strip the extras and tighten unions).

function toEntry(row: {
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  accountId: string;
  note: string | null;
  source: string;
  recurringId: string | null;
  postedForMonth: string | null;
  chapterId: string;
  importHash: string | null;
}): Entry {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    categoryId: row.categoryId,
    accountId: row.accountId,
    note: row.note ?? undefined,
    source: row.source === "recurring" ? "recurring" : "manual",
    recurringId: row.recurringId ?? undefined,
    postedForMonth: row.postedForMonth ?? undefined,
    chapterId: row.chapterId,
    importHash: row.importHash ?? undefined,
  };
}

function toRecurring(row: {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
  accountId: string;
  dayOfMonth: number;
  startMonth: string;
  endMonth: string | null;
}): Recurring {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    categoryId: row.categoryId,
    accountId: row.accountId,
    dayOfMonth: row.dayOfMonth,
    startMonth: row.startMonth as ISOMonth,
    endMonth: (row.endMonth ?? undefined) as ISOMonth | undefined,
  };
}

function toCategory(row: { id: string; label: string; kind: string; color: string | null; archived: boolean }): Category {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind === "income" ? "income" : "expense",
    color: row.color ?? undefined,
    archived: row.archived,
  };
}

function toAccount(row: { id: string; label: string; kind: string; archived: boolean }): Account {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind as Account["kind"],
    archived: row.archived,
  };
}

function toSnapshot(row: { id: string; date: string; accountId: string; balance: number }): Snapshot {
  return {
    id: row.id,
    date: row.date,
    accountId: row.accountId,
    balance: row.balance,
  };
}

// --- Domain → Prisma data builders. Centralised so adding a field to a
// domain type only touches one place per entity, instead of every upsert
// callsite.

function entryData(e: Entry) {
  return {
    date: e.date,
    amount: e.amount,
    categoryId: e.categoryId,
    accountId: e.accountId,
    note: e.note ?? null,
    source: e.source,
    recurringId: e.recurringId ?? null,
    postedForMonth: e.postedForMonth ?? null,
    chapterId: e.chapterId,
    importHash: e.importHash ?? null,
  };
}

function recurringData(r: Recurring) {
  return {
    label: r.label,
    amount: r.amount,
    categoryId: r.categoryId,
    accountId: r.accountId,
    dayOfMonth: r.dayOfMonth,
    startMonth: r.startMonth,
    endMonth: r.endMonth ?? null,
  };
}

function categoryData(c: Category) {
  return {
    label: c.label,
    kind: c.kind,
    color: c.color ?? null,
    archived: c.archived,
  };
}

function accountData(a: Account) {
  return {
    label: a.label,
    kind: a.kind,
    archived: a.archived,
  };
}

// --- Per-entity repos.

export const entries = {
  async upsert(userId: string, e: Entry): Promise<void> {
    const data = entryData(e);
    await prisma.entry.upsert({
      where: { id: e.id },
      create: { id: e.id, userId, ...data },
      update: data,
    });
  },
  // deleteMany with userId filter prevents one user from deleting another's
  // row by guessing an id — even though ids are nanoid-random, defense-in-depth.
  async delete(userId: string, id: ID): Promise<void> {
    await prisma.entry.deleteMany({ where: { id, userId } });
  },
};

export const recurring = {
  async upsert(userId: string, r: Recurring): Promise<void> {
    const data = recurringData(r);
    await prisma.recurring.upsert({
      where: { id: r.id },
      create: { id: r.id, userId, ...data },
      update: data,
    });
  },
  async delete(userId: string, id: ID): Promise<void> {
    await prisma.recurring.deleteMany({ where: { id, userId } });
  },
};

export const categories = {
  async upsert(userId: string, c: Category): Promise<void> {
    const data = categoryData(c);
    await prisma.category.upsert({
      where: { id: c.id },
      create: { id: c.id, userId, ...data },
      update: data,
    });
  },
};

export const accounts = {
  async upsert(userId: string, a: Account): Promise<void> {
    const data = accountData(a);
    await prisma.bookAccount.upsert({
      where: { id: a.id },
      create: { id: a.id, userId, ...data },
      update: data,
    });
  },
};

export const snapshots = {
  async create(userId: string, s: Snapshot): Promise<void> {
    await prisma.snapshot.create({
      data: { id: s.id, userId, date: s.date, accountId: s.accountId, balance: s.balance },
    });
  },
  // Used by migrateFromLocal: re-running migration on a device that already
  // synced shouldn't error on conflicting ids.
  async upsert(userId: string, s: Snapshot): Promise<void> {
    await prisma.snapshot.upsert({
      where: { id: s.id },
      create: { id: s.id, userId, date: s.date, accountId: s.accountId, balance: s.balance },
      update: { date: s.date, accountId: s.accountId, balance: s.balance },
    });
  },
};

export const postedMonths = {
  async mark(userId: string, month: ISOMonth): Promise<void> {
    await prisma.postedMonth.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month },
      update: {},
    });
  },
};

// --- Aggregate read.

export async function pullSnapshot(userId: string): Promise<BackendSnapshot> {
  const [entryRows, recurringRows, categoryRows, accountRows, snapshotRows, postedMonthRows] = await Promise.all([
    prisma.entry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.recurring.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.bookAccount.findMany({ where: { userId } }),
    prisma.snapshot.findMany({ where: { userId } }),
    prisma.postedMonth.findMany({ where: { userId } }),
  ]);

  return {
    entries: entryRows.map(toEntry),
    recurring: recurringRows.map(toRecurring),
    categories: categoryRows.map(toCategory),
    accounts: accountRows.map(toAccount),
    snapshots: snapshotRows.map(toSnapshot),
    postedMonths: postedMonthRows.map((p) => p.month as ISOMonth),
  };
}

// --- Bulk upsert from local snapshot.
// Idempotent (upsert by id). No transaction — Prisma Postgres / pgbouncer-fronted
// endpoints don't reliably support interactive transactions (P2028).
export async function migrateSnapshot(userId: string, snapshot: BackendSnapshot): Promise<void> {
  for (const c of snapshot.categories) await categories.upsert(userId, c);
  for (const a of snapshot.accounts) await accounts.upsert(userId, a);
  for (const r of snapshot.recurring) await recurring.upsert(userId, r);
  for (const e of snapshot.entries) await entries.upsert(userId, e);
  for (const s of snapshot.snapshots) await snapshots.upsert(userId, s);
  for (const m of snapshot.postedMonths) await postedMonths.mark(userId, m);
}
