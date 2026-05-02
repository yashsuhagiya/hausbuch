import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    out.session = await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    out.sessionError = serialize(err);
    return NextResponse.json(out, { status: 500 });
  }

  const userId = (out.session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) return NextResponse.json({ ...out, error: "no userId on session" }, { status: 401 });

  try {
    const [entries, recurring, categories, bookAccounts, snapshots, postedMonths] = await Promise.all([
      prisma.entry.count({ where: { userId } }),
      prisma.recurring.count({ where: { userId } }),
      prisma.category.count({ where: { userId } }),
      prisma.bookAccount.count({ where: { userId } }),
      prisma.snapshot.count({ where: { userId } }),
      prisma.postedMonth.count({ where: { userId } }),
    ]);
    out.counts = { entries, recurring, categories, bookAccounts, snapshots, postedMonths };
  } catch (err) {
    out.queryError = serialize(err);
    return NextResponse.json(out, { status: 500 });
  }

  return NextResponse.json(out);
}

function serialize(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      code: (err as { code?: string }).code,
      stack: err.stack?.split("\n").slice(0, 6),
    };
  }
  return { value: String(err) };
}
