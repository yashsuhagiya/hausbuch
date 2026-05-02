import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, code: (err as { code?: string }).code },
      { status: 500 },
    );
  }
}
