"use client";
import { useMemo, useRef } from "react";
import { evaluate } from "@/lib/evaluator";
import { decimalToCents, formatEUR } from "@/lib/money";

interface Props {
  value: string;
  onChange: (s: string) => void;
}

// Display glyph → character actually inserted into the field. The evaluator
// expects ASCII `* /`; the chips show mathematical `× ÷` because that's what
// users actually recognize.
const OPS: Array<{ label: string; insert: string; aria: string }> = [
  { label: "+", insert: "+", aria: "Plus" },
  { label: "−", insert: "-", aria: "Minus" },
  { label: "×", insert: "*", aria: "Times" },
  { label: "÷", insert: "/", aria: "Divide" },
];

export function AmountField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const evaluated = useMemo(() => evaluate(value), [value]);
  const cents = evaluated.ok ? decimalToCents(evaluated.value) : null;

  // Insert at the current caret position (or append if the input has no
  // selection — happens after we re-set value programmatically).
  function insertOp(op: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + op + value.slice(end);
    onChange(next);
    // Restore caret position after React re-renders the input.
    requestAnimationFrame(() => {
      const e = inputRef.current;
      if (!e) return;
      const pos = start + op.length;
      e.focus();
      e.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="mb-3">
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">
        Amount · type math, it adds up
      </div>
      <div className="flex items-baseline justify-between border-b border-ink py-1.5 gap-2">
        <input
          ref={inputRef}
          type="text"
          // biome-ignore lint/a11y/noAutofocus: focus on open is desired UX
          autoFocus
          inputMode="decimal"
          className="flex-1 bg-transparent font-display italic text-2xl tnum outline-none min-w-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          aria-label="Amount"
        />
        {cents !== null && cents > 0 && (
          <span className="font-mono text-xs text-rust border border-rust px-1.5 py-0.5 whitespace-nowrap">
            = {formatEUR(cents)}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {OPS.map((op) => (
          <button
            key={op.insert}
            type="button"
            aria-label={op.aria}
            // onPointerDown + preventDefault keeps the iOS num pad open. A
            // plain onClick would shift focus to the button, dismissing the
            // keyboard — and after every operator tap the user would have to
            // re-tap the input to keep typing digits.
            onPointerDown={(e) => {
              e.preventDefault();
              insertOp(op.insert);
            }}
            className="flex-1 font-mono text-base border border-hairline text-ink py-2 hover:bg-ink hover:text-paper active:bg-ink active:text-paper"
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
}
