"use server";
// Sync server actions — read/write the user's Hausbuch data in Postgres.
// Each action authenticates against the current Better Auth session and
// scopes all queries to the resulting userId.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { BackendSnapshot } from "@/lib/backend/types";
import { prisma } from "@/lib/db";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "@/lib/types";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

export async function pullSnapshot(): Promise<BackendSnapshot> {
  const userId = await requireUserId();

  // Fetch all user-scoped rows in parallel; Prisma resolves them concurrently.
  const [entries, recurring, categories, bookAccounts, snapshots, postedMonths] = await Promise.all([
    prisma.entry.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.recurring.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.bookAccount.findMany({ where: { userId } }),
    prisma.snapshot.findMany({ where: { userId } }),
    prisma.postedMonth.findMany({ where: { userId } }),
  ]);

  return {
    entries: entries.map(toEntry),
    recurring: recurring.map(toRecurring),
    categories: categories.map(toCategory),
    accounts: bookAccounts.map(toAccount),
    snapshots: snapshots.map(toSnapshot),
    postedMonths: postedMonths.map((p) => p.month as ISOMonth),
  };
}

export async function upsertEntryAction(entry: Entry): Promise<void> {
  const userId = await requireUserId();
  const data = {
    date: entry.date,
    amount: entry.amount,
    categoryId: entry.categoryId,
    accountId: entry.accountId,
    note: entry.note ?? null,
    source: entry.source,
    recurringId: entry.recurringId ?? null,
    postedForMonth: entry.postedForMonth ?? null,
    chapterId: entry.chapterId,
    importHash: entry.importHash ?? null,
  };
  await prisma.entry.upsert({
    where: { id: entry.id },
    create: { id: entry.id, userId, ...data },
    update: data,
  });
}

export async function deleteEntryAction(id: ID): Promise<void> {
  const userId = await requireUserId();
  // deleteMany with userId filter prevents one user from deleting another's
  // row by guessing an id — even though ids are nanoid-random, defense-in-depth.
  await prisma.entry.deleteMany({ where: { id, userId } });
}

export async function upsertRecurringAction(r: Recurring): Promise<void> {
  const userId = await requireUserId();
  const data = {
    label: r.label,
    amount: r.amount,
    categoryId: r.categoryId,
    accountId: r.accountId,
    dayOfMonth: r.dayOfMonth,
    startMonth: r.startMonth,
    endMonth: r.endMonth ?? null,
  };
  await prisma.recurring.upsert({
    where: { id: r.id },
    create: { id: r.id, userId, ...data },
    update: data,
  });
}

export async function deleteRecurringAction(id: ID): Promise<void> {
  const userId = await requireUserId();
  await prisma.recurring.deleteMany({ where: { id, userId } });
}

export async function upsertCategoryAction(c: Category): Promise<void> {
  const userId = await requireUserId();
  const data = {
    label: c.label,
    kind: c.kind,
    color: c.color ?? null,
    archived: c.archived,
  };
  await prisma.category.upsert({
    where: { id: c.id },
    create: { id: c.id, userId, ...data },
    update: data,
  });
}

export async function upsertAccountAction(a: Account): Promise<void> {
  const userId = await requireUserId();
  const data = {
    label: a.label,
    kind: a.kind,
    archived: a.archived,
  };
  await prisma.bookAccount.upsert({
    where: { id: a.id },
    create: { id: a.id, userId, ...data },
    update: data,
  });
}

export async function addSnapshotAction(s: Snapshot): Promise<void> {
  const userId = await requireUserId();
  await prisma.snapshot.create({
    data: { id: s.id, userId, date: s.date, accountId: s.accountId, balance: s.balance },
  });
}

export async function markPostedAction(month: ISOMonth): Promise<void> {
  const userId = await requireUserId();
  await prisma.postedMonth.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month },
    update: {},
  });
}

/**
 * One-shot bulk upload of a localStorage snapshot into the user's Postgres
 * account. Idempotent: each row upserts by id, so running the migration twice
 * (e.g. user clicked twice, or partial failure) is safe.
 *
 * This runs inside a single transaction so a partial failure doesn't leave
 * the account half-migrated.
 */
export async function migrateFromLocalAction(snapshot: BackendSnapshot): Promise<void> {
  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
    // Categories and accounts first — entries reference them, and while we
    // don't enforce FKs to those, ordering keeps things sane for any future
    // constraint we add.
    for (const c of snapshot.categories) {
      await tx.category.upsert({
        where: { id: c.id },
        create: { id: c.id, userId, label: c.label, kind: c.kind, color: c.color ?? null, archived: c.archived },
        update: { label: c.label, kind: c.kind, color: c.color ?? null, archived: c.archived },
      });
    }
    for (const a of snapshot.accounts) {
      await tx.bookAccount.upsert({
        where: { id: a.id },
        create: { id: a.id, userId, label: a.label, kind: a.kind, archived: a.archived },
        update: { label: a.label, kind: a.kind, archived: a.archived },
      });
    }
    for (const r of snapshot.recurring) {
      await tx.recurring.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          userId,
          label: r.label,
          amount: r.amount,
          categoryId: r.categoryId,
          accountId: r.accountId,
          dayOfMonth: r.dayOfMonth,
          startMonth: r.startMonth,
          endMonth: r.endMonth ?? null,
        },
        update: {
          label: r.label,
          amount: r.amount,
          categoryId: r.categoryId,
          accountId: r.accountId,
          dayOfMonth: r.dayOfMonth,
          startMonth: r.startMonth,
          endMonth: r.endMonth ?? null,
        },
      });
    }
    for (const e of snapshot.entries) {
      const data = {
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
      await tx.entry.upsert({
        where: { id: e.id },
        create: { id: e.id, userId, ...data },
        update: data,
      });
    }
    for (const s of snapshot.snapshots) {
      await tx.snapshot.upsert({
        where: { id: s.id },
        create: { id: s.id, userId, date: s.date, accountId: s.accountId, balance: s.balance },
        update: { date: s.date, accountId: s.accountId, balance: s.balance },
      });
    }
    for (const m of snapshot.postedMonths) {
      await tx.postedMonth.upsert({
        where: { userId_month: { userId, month: m } },
        create: { userId, month: m },
        update: {},
      });
    }
  });
}

// Prisma rows carry `userId` + timestamps that the domain types don't expose;
// these mappers strip the extras and tighten the source/kind unions.

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

function toCategory(row: {
  id: string;
  label: string;
  kind: string;
  color: string | null;
  archived: boolean;
}): Category {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind === "income" ? "income" : "expense",
    color: row.color ?? undefined,
    archived: row.archived,
  };
}

function toAccount(row: { id: string; label: string; kind: string; archived: boolean }): Account {
  const kind = row.kind as Account["kind"];
  return {
    id: row.id,
    label: row.label,
    kind,
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
