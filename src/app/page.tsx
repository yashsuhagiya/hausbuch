"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { currentMonth } from "@/lib/date";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/m/${currentMonth()}`);
  }, [router]);
  return (
    <main className="max-w-3xl mx-auto px-6 py-24 text-center">
      <h1 className="font-display text-5xl italic">Hausbuch.</h1>
      <p className="font-display italic text-sage mt-2">Ein einfaches Buch für die laufenden Ausgaben.</p>
    </main>
  );
}
