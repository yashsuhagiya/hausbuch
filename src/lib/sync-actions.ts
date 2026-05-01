"use server";
// Sync server actions — read/write the user's Hausbuch data in Postgres.
// Each action authenticates against the current Better Auth session and
// scopes all queries to the resulting userId. Phase 2 implements `pull` only;
// mutation actions land in Phase 3.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { BackendSnapshot } from "@/lib/backend/types";
import { prisma } from "@/lib/db";
import type { Account, Category, Entry, ISOMonth, Recurring, Snapshot } from "@/lib/types";

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
