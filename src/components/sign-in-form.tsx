"use client";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        throw new Error(res.error.message ?? `HTTP ${res.error.status ?? "?"}`);
      }
      window.location.href = "/";
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage block mb-1">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          suppressHydrationWarning
          className="w-full border-b border-ink py-1 bg-transparent outline-none"
        />
      </label>

      <label className="block">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-sage block mb-1">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          suppressHydrationWarning
          className="w-full border-b border-ink py-1 bg-transparent outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full font-mono text-xs uppercase tracking-widest border border-ink px-3 py-3 hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {busy ? "…" : "Sign in"}
      </button>

      {err && <p className="font-mono text-xs text-rust">{err}</p>}
    </form>
  );
}
