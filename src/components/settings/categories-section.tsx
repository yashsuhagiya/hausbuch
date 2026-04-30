"use client";
import { useState } from "react";
import { newId } from "@/lib/ids";
import { useStore } from "@/lib/store";

export function CategoriesSection() {
  const cats = useStore((s) => s.categories);
  const upsert = useStore((s) => s.upsertCategory);
  const [newLabel, setNewLabel] = useState("");
  const [newKind, setNewKind] = useState<"income" | "expense">("expense");

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    upsert({ id: newId(), label, kind: newKind, archived: false });
    setNewLabel("");
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-4">Categories</h2>

      <ul className="mb-4">
        {cats.map((c) => (
          <li
            key={c.id}
            className="grid grid-cols-[1fr_80px_80px] gap-3 items-baseline py-2 border-b border-dotted border-hairline"
          >
            <input
              className={`bg-transparent outline-none ${c.archived ? "text-sage line-through" : ""}`}
              value={c.label}
              onChange={(e) => upsert({ ...c, label: e.target.value })}
              aria-label={`Category label for ${c.label}`}
            />
            <span className="font-mono text-[0.6rem] tracking-wide uppercase text-sage">{c.kind}</span>
            <button
              type="button"
              onClick={() => upsert({ ...c, archived: !c.archived })}
              className="font-mono text-[0.6rem] uppercase tracking-wide text-sage hover:text-rust text-right"
            >
              {c.archived ? "restore" : "archive"}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          placeholder="New category label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          className="flex-1 border-b border-ink py-1 bg-transparent outline-none"
          aria-label="New category label"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as "income" | "expense")}
          className="border-b border-ink py-1 bg-transparent font-mono text-xs"
          aria-label="New category kind"
        >
          <option value="expense">expense</option>
          <option value="income">income</option>
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
