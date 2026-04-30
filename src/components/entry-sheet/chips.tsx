"use client";

interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  items: ChipItem[];
  value: string;
  onChange: (id: string) => void;
}

export function Chips({ items, value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onChange(it.id)}
          className={`font-mono text-[0.65rem] tracking-wide uppercase px-2.5 py-1.5 border ${
            value === it.id ? "bg-ink text-paper border-ink" : "border-hairline text-sage hover:text-ink"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
