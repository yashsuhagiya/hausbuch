"use client";
import { useMemo } from "react";
import { evaluate } from "@/lib/evaluator";
import { decimalToCents, formatEUR } from "@/lib/money";

interface Props {
  value: string;
  onChange: (s: string) => void;
}

export function AmountField({ value, onChange }: Props) {
  const evaluated = useMemo(() => evaluate(value), [value]);
  const cents = evaluated.ok ? decimalToCents(evaluated.value) : null;

  return (
    <div className="mb-3">
      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-sage mb-1">
        Amount · type math, it adds up
      </div>
      <div className="flex items-baseline justify-between border-b border-ink py-1.5 gap-2">
        <input
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
    </div>
  );
}
