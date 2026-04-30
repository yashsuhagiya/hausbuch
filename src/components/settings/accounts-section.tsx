"use client";
import { useState } from "react";
import { newId } from "@/lib/ids";
import { useStore } from "@/lib/store";
import type { Account } from "@/lib/types";

const KINDS: Account["kind"][] = ["giro", "cash", "savings", "credit"];

export function AccountsSection() {
  const accs = useStore((s) => s.accounts);
  const upsert = useStore((s) => s.upsertAccount);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Account["kind"]>("giro");

  function add() {
    const trimmed = label.trim();
    if (!trimmed) return;
    upsert({ id: newId(), label: trimmed, kind, archived: false });
    setLabel("");
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-4">Accounts</h2>

      <ul className="mb-4">
        {accs.map((a) => (
          <li
            key={a.id}
            className="grid grid-cols-[1fr_80px_80px] gap-3 items-baseline py-2 border-b border-dotted border-hairline"
          >
            <input
              className={`bg-transparent outline-none ${a.archived ? "text-sage line-through" : ""}`}
              value={a.label}
              onChange={(e) => upsert({ ...a, label: e.target.value })}
              aria-label={`Account label for ${a.label}`}
            />
            <span className="font-mono text-[0.6rem] tracking-wide uppercase text-sage">{a.kind}</span>
            <button
              type="button"
              onClick={() => upsert({ ...a, archived: !a.archived })}
              className="font-mono text-[0.6rem] uppercase tracking-wide text-sage hover:text-rust text-right"
            >
              {a.archived ? "restore" : "archive"}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          placeholder="New account label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          className="flex-1 border-b border-ink py-1 bg-transparent outline-none"
          aria-label="New account label"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Account["kind"])}
          className="border-b border-ink py-1 bg-transparent font-mono text-xs"
          aria-label="New account kind"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          className="font-mono text-xs uppercase tracking-widest text-rust border border-rust px-3"
        >
          + add
        </button>
      </div>
    </section>
  );
}
