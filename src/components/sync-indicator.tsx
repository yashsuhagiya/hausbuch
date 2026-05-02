"use client";
import { useStore } from "@/lib/store";

export function SyncIndicator() {
  const status = useStore((s) => s.syncStatus);
  const pending = useStore((s) => s.pendingWrites);
  const refresh = useStore((s) => s.refresh);

  if (status === "ok" || status === "idle") return null;
  if (status === "syncing" && pending === 0) return null;

  const tone = status === "failing" ? "border-rust text-rust" : "border-sage text-sage";
  const label = status === "failing" ? "Sync failed — retry" : `Syncing ${pending}…`;
  const clickable = status === "failing";

  return (
    <button
      type="button"
      onClick={clickable ? () => refresh() : undefined}
      disabled={!clickable}
      aria-live="polite"
      className={`fixed bottom-3 right-3 z-50 font-mono text-[0.6rem] uppercase tracking-widest px-3 py-1.5 bg-paper border ${tone} ${clickable ? "cursor-pointer hover:bg-ink/5" : "cursor-default"}`}
    >
      {label}
    </button>
  );
}
