"use client";
import { useState } from "react";
import { signOut, useSession } from "@/lib/auth-client";

export function SyncSection() {
  const { data: session, isPending } = useSession();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      window.location.href = "/sign-in";
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <section className="mb-12">
        <h2 className="font-display text-2xl italic mb-4">Account</h2>
        <p className="font-mono text-xs text-sage">Loading…</p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-2">Account</h2>
      <p className="font-display italic text-sage mb-3">
        Signed in as <span className="text-ink">{session?.user?.email}</span>.
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="font-mono text-xs uppercase tracking-widest border border-rust text-rust px-3 py-2 hover:bg-rust hover:text-paper disabled:opacity-50"
      >
        Sign out
      </button>
    </section>
  );
}
