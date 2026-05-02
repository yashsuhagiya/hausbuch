"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function StoreHydrator() {
  const hydrate = useStore((s) => s.hydrate);
  const refresh = useStore((s) => s.refresh);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    const onOnline = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  return null;
}
