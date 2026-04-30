"use client";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { todayISO } from "@/lib/date";
import { decimalToCents, formatEUR } from "@/lib/money";
import { useStore } from "@/lib/store";

interface SeriesPoint {
  date: string;
  value: number;
}

export function SnapshotsSection() {
  const accounts = useStore((s) => s.accounts);
  const snapshots = useStore((s) => s.snapshots);
  const add = useStore((s) => s.addSnapshot);

  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [balance, setBalance] = useState("");

  // pick a default account once accounts are available
  const defaultAccountId = accounts[0]?.id ?? "";
  const effectiveAccountId = accountId || defaultAccountId;

  function save() {
    const acc = effectiveAccountId;
    const amount = Number.parseFloat(balance);
    if (!acc || !Number.isFinite(amount)) return;
    add({ date, accountId: acc, balance: decimalToCents(amount) });
    setBalance("");
  }

  // Sorted snapshots (most recent first for the table)
  const tableRows = useMemo(() => [...snapshots].sort((a, b) => b.date.localeCompare(a.date)), [snapshots]);

  // Net worth series: sum balances by date, ascending
  const series: SeriesPoint[] = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const s of snapshots) {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.balance);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, total]) => ({ date: d, value: total / 100 }));
  }, [snapshots]);

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-4">Snapshots — net worth</h2>

      {series.length > 1 && (
        <div className="h-[180px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                stroke="var(--color-sage)"
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                stroke="var(--color-sage)"
                tickFormatter={(v: number) => formatEUR(Math.round(v * 100))}
                width={80}
              />
              <Tooltip
                formatter={(v) => formatEUR(Math.round(Number(v) * 100))}
                contentStyle={{
                  background: "var(--color-paper)",
                  border: "1px solid var(--color-ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "var(--color-rust)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tableRows.length === 0 ? (
        <p className="font-display italic text-sage mb-4">
          No snapshots yet — add one below to start tracking net worth.
        </p>
      ) : (
        <ul className="mb-4">
          {tableRows.map((s) => {
            const acc = accounts.find((a) => a.id === s.accountId);
            return (
              <li
                key={s.id}
                className="grid grid-cols-[100px_1fr_120px] gap-3 py-2 border-b border-dotted border-hairline"
              >
                <span className="font-mono text-xs">{s.date}</span>
                <span>{acc?.label ?? "?"}</span>
                <span className="font-display tnum text-right">{formatEUR(s.balance)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-[120px_1fr_140px_80px] gap-2 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border-b border-ink py-1 bg-transparent font-mono text-sm outline-none"
          aria-label="Snapshot date"
        />
        <select
          value={effectiveAccountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="border-b border-ink py-1 bg-transparent"
          aria-label="Snapshot account"
        >
          {accounts.length === 0 && <option value="">no accounts</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <input
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="balance"
          inputMode="decimal"
          className="border-b border-ink py-1 bg-transparent font-mono outline-none"
          aria-label="Snapshot balance (decimal)"
        />
        <button
          type="button"
          onClick={save}
          className="font-mono text-xs uppercase tracking-widest text-rust border border-rust py-1"
        >
          + add
        </button>
      </div>
    </section>
  );
}
