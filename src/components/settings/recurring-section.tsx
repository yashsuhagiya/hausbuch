"use client";
import { useEffect, useState } from "react";
import { currentMonth } from "@/lib/date";
import { signAmount } from "@/lib/entry";
import { newId } from "@/lib/ids";
import { decimalToCents, formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Recurring } from "@/lib/types";

export function RecurringSection() {
  const recurring = useStore((s) => s.recurring);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const upsert = useStore((s) => s.upsertRecurring);
  const remove = useStore((s) => s.deleteRecurring);

  const [editing, setEditing] = useState<Recurring | null>(null);
  const [isNew, setIsNew] = useState(false);

  function blank(): Recurring {
    return {
      id: newId(),
      label: "",
      amount: 0,
      categoryId: categories[0]?.id ?? "",
      accountId: accounts[0]?.id ?? "",
      dayOfMonth: 1,
      startMonth: currentMonth(),
    };
  }

  return (
    <section className="mb-12">
      <header className="flex justify-between items-baseline mb-4">
        <h2 className="font-display text-2xl italic">Recurring</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(blank());
            setIsNew(true);
          }}
          className="font-mono text-xs uppercase tracking-widest text-rust border border-rust px-3 py-1"
        >
          + add
        </button>
      </header>

      {recurring.length === 0 && <p className="font-display italic text-sage">No recurring entries yet.</p>}

      <ul>
        {recurring.map((r) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: rows are also editable via the form below; click is a shortcut
          <li
            key={r.id}
            className="grid grid-cols-[1fr_120px_60px_60px] gap-3 items-baseline py-2 border-b border-dotted border-hairline cursor-pointer hover:bg-rust/5"
            onClick={() => {
              setEditing(r);
              setIsNew(false);
            }}
          >
            <span>{r.label || <em className="text-sage">unnamed</em>}</span>
            <span className="font-display tnum text-right text-sm">{formatEUR(r.amount)}</span>
            <span className="font-mono text-[0.6rem] tracking-wide uppercase text-sage">day {r.dayOfMonth}</span>
            <span className="font-mono text-[0.6rem] tracking-wide uppercase text-sage">{r.startMonth}</span>
          </li>
        ))}
      </ul>

      {editing && (
        <RecurringEditor
          initial={editing}
          isNew={isNew}
          onSave={(r) => {
            upsert(r);
            setEditing(null);
            setIsNew(false);
          }}
          onDelete={(id) => {
            remove(id);
            setEditing(null);
            setIsNew(false);
          }}
          onCancel={() => {
            setEditing(null);
            setIsNew(false);
          }}
        />
      )}
    </section>
  );
}

interface EditorProps {
  initial: Recurring;
  isNew: boolean;
  onSave: (r: Recurring) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

function RecurringEditor({ initial, isNew, onSave, onDelete, onCancel }: EditorProps) {
  const cats = useStore((s) => s.categories);
  const accs = useStore((s) => s.accounts);

  const [r, setR] = useState<Recurring>(initial);
  const [amountStr, setAmountStr] = useState(() => (Math.abs(initial.amount) / 100).toFixed(2));

  useEffect(() => {
    setR(initial);
    setAmountStr((Math.abs(initial.amount) / 100).toFixed(2));
  }, [initial]);

  function save() {
    const cat = cats.find((c) => c.id === r.categoryId);
    const cents = decimalToCents(Number.parseFloat(amountStr) || 0);
    onSave({ ...r, amount: signAmount(cents, cat) });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss is a convenience
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/30"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full md:w-[460px] bg-paper border-t md:border border-ink p-6 md:rounded-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "New recurring" : "Edit recurring"}
      >
        <h3 className="font-display italic text-xl mb-4">{isNew ? "New recurring" : "Edit recurring"}</h3>
        <Field label="Label">
          <input
            className="w-full border-b border-ink py-1 bg-transparent outline-none"
            value={r.label}
            onChange={(e) => setR({ ...r, label: e.target.value })}
          />
        </Field>
        <Field label="Amount (decimal, positive)">
          <input
            className="w-full border-b border-ink py-1 bg-transparent outline-none font-mono"
            value={amountStr}
            inputMode="decimal"
            onChange={(e) => setAmountStr(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select
            className="w-full border-b border-ink py-1 bg-transparent"
            value={r.categoryId}
            onChange={(e) => setR({ ...r, categoryId: e.target.value })}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.kind})
              </option>
            ))}
          </select>
        </Field>
        {accs.length > 1 && (
          <Field label="Account">
            <select
              className="w-full border-b border-ink py-1 bg-transparent"
              value={r.accountId}
              onChange={(e) => setR({ ...r, accountId: e.target.value })}
            >
              {accs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Day of month (1-31; clamped to month end)">
          <input
            type="number"
            min={1}
            max={31}
            className="w-full border-b border-ink py-1 bg-transparent font-mono"
            value={r.dayOfMonth}
            onChange={(e) => setR({ ...r, dayOfMonth: Number.parseInt(e.target.value, 10) || 1 })}
          />
        </Field>
        <Field label="Start month (YYYY-MM)">
          <input
            className="w-full border-b border-ink py-1 bg-transparent font-mono"
            value={r.startMonth}
            onChange={(e) => setR({ ...r, startMonth: e.target.value })}
          />
        </Field>
        <Field label="End month (YYYY-MM, optional, exclusive)">
          <input
            className="w-full border-b border-ink py-1 bg-transparent font-mono"
            value={r.endMonth ?? ""}
            onChange={(e) => setR({ ...r, endMonth: e.target.value || undefined })}
          />
        </Field>

        <div className="flex gap-2 mt-4">
          {!isNew && (
            <button
              type="button"
              onClick={() => onDelete(r.id)}
              className="flex-1 py-3 font-display italic text-sm text-rust border border-rust"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={save}
            className="flex-[2] py-3 font-display italic text-base bg-rust text-paper"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">{label}</div>
      {children}
    </div>
  );
}
