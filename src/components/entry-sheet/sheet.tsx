"use client";
import { useEffect, useMemo, useState } from "react";
import { AmountField } from "@/components/entry-sheet/amount-field";
import { Chips } from "@/components/entry-sheet/chips";
import { todayISO } from "@/lib/date";
import { signAmount } from "@/lib/entry";
import { evaluate } from "@/lib/evaluator";
import { decimalToCents } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Entry, ISODate } from "@/lib/types";

interface Props {
  open: boolean;
  initial?: Entry;
  defaultDate?: ISODate;
  onClose: () => void;
}

export function EntrySheet({ open, initial, defaultDate, onClose }: Props) {
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const addEntry = useStore((s) => s.addEntry);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);

  const visibleCategories = useMemo(() => categories.filter((c) => !c.archived), [categories]);
  const visibleAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);

  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState<ISODate>(todayISO());
  const [note, setNote] = useState("");

  // Reset whenever the sheet opens (new or edit)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setAmountText((Math.abs(initial.amount) / 100).toFixed(2));
      setCategoryId(initial.categoryId);
      setAccountId(initial.accountId);
      setDate(initial.date);
      setNote(initial.note ?? "");
    } else {
      setAmountText("");
      setCategoryId(visibleCategories[0]?.id ?? "");
      setAccountId(visibleAccounts[0]?.id ?? "");
      setDate(defaultDate ?? todayISO());
      setNote("");
    }
  }, [open, initial, defaultDate, visibleCategories, visibleAccounts]);

  const evaluated = useMemo(() => evaluate(amountText), [amountText]);
  const absCents = evaluated.ok ? decimalToCents(evaluated.value) : null;

  const cat = categories.find((c) => c.id === categoryId);
  const canSave = absCents !== null && absCents > 0 && Boolean(categoryId) && Boolean(accountId) && Boolean(date);

  function save() {
    if (!canSave || absCents === null) return;
    const signed = signAmount(absCents, cat);
    if (initial) {
      updateEntry(initial.id, {
        amount: signed,
        categoryId,
        accountId,
        date,
        note: note.trim() || undefined,
      });
    } else {
      addEntry({
        date,
        amount: signed,
        categoryId,
        accountId,
        note: note.trim() || undefined,
        source: "manual",
        chapterId: "current",
      });
    }
    onClose();
  }

  function remove() {
    if (!initial) return;
    deleteEntry(initial.id);
    onClose();
  }

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop is a presentational overlay, not a real control
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full md:w-[460px] bg-paper border-t md:border border-ink p-6 md:rounded-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit entry" : "New entry"}
      >
        <div className="hidden md:block w-10 h-[3px] bg-hairline mx-auto mb-5" />
        <h2 className="font-display italic text-2xl mb-4">{initial ? "Edit entry" : "New entry"}</h2>

        <AmountField value={amountText} onChange={setAmountText} />

        <div className="mb-3">
          <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">Category</div>
          <Chips items={visibleCategories} value={categoryId} onChange={setCategoryId} />
        </div>

        {visibleAccounts.length > 1 && (
          <div className="mb-3">
            <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">Account</div>
            <Chips items={visibleAccounts} value={accountId} onChange={setAccountId} />
          </div>
        )}

        <div className="mb-3">
          <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">When</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full font-mono text-sm border-b border-ink py-1 bg-transparent outline-none"
          />
        </div>

        <div className="mb-4">
          <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">Note · optional</div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm border-b border-hairline py-1 bg-transparent outline-none"
          />
        </div>

        <div className="flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={remove}
              className="flex-1 py-3 font-display italic text-sm text-rust border border-rust"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            disabled={!canSave}
            onClick={save}
            className="flex-[2] py-3 font-display italic text-base bg-rust text-paper disabled:opacity-40"
          >
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}
