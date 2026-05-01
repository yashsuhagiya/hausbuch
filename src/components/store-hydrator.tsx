"use client";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useStore } from "@/lib/store";

export function StoreHydrator() {
  const hydrate = useStore((s) => s.hydrate);
  const { data: session, isPending } = useSession();

  // Wait for session resolution before deciding which backend to pull from —
  // hydrating eagerly with signedIn=false would mean a brief flash of local
  // data on signed-in devices, then a second pull. One hydrate, after we know.
  useEffect(() => {
    if (isPending) return;
    hydrate(Boolean(session?.user?.id));
  }, [hydrate, isPending, session?.user?.id]);

  return null;
}
