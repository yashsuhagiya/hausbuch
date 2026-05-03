"use server";
// Sync server actions — thin auth + delegate wrappers around lib/repo.
// All persistence logic and row mapping lives in lib/repo. These
// functions exist to (a) authenticate against the current Better Auth
// session and (b) cross the client/server boundary.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { BackendSnapshot } from "@/lib/backend/types";
import * as repo from "@/lib/repo";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "@/lib/types";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

export async function pullSnapshot(): Promise<BackendSnapshot> {
  return repo.pullSnapshot(await requireUserId());
}

export async function upsertEntryAction(entry: Entry): Promise<void> {
  await repo.entries.upsert(await requireUserId(), entry);
}

export async function deleteEntryAction(id: ID): Promise<void> {
  await repo.entries.delete(await requireUserId(), id);
}

export async function upsertRecurringAction(r: Recurring): Promise<void> {
  await repo.recurring.upsert(await requireUserId(), r);
}

export async function deleteRecurringAction(id: ID): Promise<void> {
  await repo.recurring.delete(await requireUserId(), id);
}

export async function upsertCategoryAction(c: Category): Promise<void> {
  await repo.categories.upsert(await requireUserId(), c);
}

export async function upsertAccountAction(a: Account): Promise<void> {
  await repo.accounts.upsert(await requireUserId(), a);
}

export async function addSnapshotAction(s: Snapshot): Promise<void> {
  await repo.snapshots.create(await requireUserId(), s);
}

export async function markPostedAction(month: ISOMonth): Promise<void> {
  await repo.postedMonths.mark(await requireUserId(), month);
}

export async function migrateFromLocalAction(snapshot: BackendSnapshot): Promise<void> {
  await repo.migrateSnapshot(await requireUserId(), snapshot);
}
