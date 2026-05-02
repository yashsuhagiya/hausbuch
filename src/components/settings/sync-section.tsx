"use client";
import { useState } from "react";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

export function SyncSection() {
  const { data: session, isPending } = useSession();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      // better-auth returns { data, error } instead of throwing on auth
      // failures, so we check `error` explicitly. Without this, a 403 from
      // origin/CSRF rejection looks like success in the UI.
      const res =
        mode === "up"
          ? await signUp.email({ email, password, name: name || email.split("@")[0] })
          : await signIn.email({ email, password });
      if (res.error) {
        const detail = res.error.message ?? `HTTP ${res.error.status ?? "?"}`;
        throw new Error(detail);
      }
      setMsg(mode === "up" ? "Account created. You're signed in." : "Signed in.");
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      setMsg(`${mode === "up" ? "Sign-up" : "Sign-in"} failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      setMsg("Signed out.");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return (
      <section className="mb-12">
        <h2 className="font-display text-2xl italic mb-4">Sync</h2>
        <p className="font-mono text-xs text-sage">Loading…</p>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-2">Sync</h2>

      {session?.user ? (
        <div>
          <p className="font-display italic text-sage mb-3">
            Signed in as <span className="text-ink">{session.user.email}</span>. This device is syncing with your
            account — edits propagate to your other devices on their next load.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={busy}
            className="font-mono text-xs uppercase tracking-widest border border-rust text-rust px-3 py-2 hover:bg-rust hover:text-paper disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div>
          <p className="font-display italic text-sage mb-3">
            Sign in to use Hausbuch on multiple devices. Your local data on this device uploads to your account on first
            sign-in.
          </p>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode("in")}
              className={`font-mono text-xs uppercase tracking-widest px-3 py-1 border ${
                mode === "in" ? "bg-ink text-paper border-ink" : "border-hairline text-sage"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("up")}
              className={`font-mono text-xs uppercase tracking-widest px-3 py-1 border ${
                mode === "up" ? "bg-ink text-paper border-ink" : "border-hairline text-sage"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {mode === "up" && (
              <label className="block sm:col-span-2">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage block mb-1">
                  Name (optional)
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b border-ink py-1 bg-transparent outline-none"
                />
              </label>
            )}
            <label className="block">
              <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage block mb-1">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-ink py-1 bg-transparent outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage block mb-1">Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-ink py-1 bg-transparent outline-none"
              />
            </label>
            <div className="sm:col-span-2 flex gap-2 mt-2">
              <button
                type="submit"
                disabled={busy}
                className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {mode === "up" ? "Create account" : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      )}

      {msg && <p className="font-mono text-xs text-sage mt-3">{msg}</p>}
    </section>
  );
}
