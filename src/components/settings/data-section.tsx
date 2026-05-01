"use client";
import { useMemo, useRef, useState } from "react";
import { formatEUR } from "@/lib/money";
import { importSplitwiseRows, type ParsedSplitwise, parseSplitwiseCSV } from "@/lib/splitwise-import";
import * as storage from "@/lib/storage";
import { useStore } from "@/lib/store";

export function DataSection() {
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const splitwiseRef = useRef<HTMLInputElement>(null);
  const hydrate = useStore((s) => s.hydrate);
  const accounts = useStore((s) => s.accounts);

  const liveAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);

  const [parsed, setParsed] = useState<ParsedSplitwise | null>(null);
  const [userColumn, setUserColumn] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");

  function exportNow() {
    const json = storage.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hausbuch-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMsg("Exported.");
  }

  function importPicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        storage.importAll(String(reader.result));
        hydrate();
        setMsg("Imported.");
      } catch (err) {
        setMsg(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  function mergePicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = storage.mergeImport(String(reader.result));
        hydrate();
        const a = result.added;
        setMsg(
          `Merged: ${a.entries} entries, ${a.recurring} recurring, ${a.accounts} accounts, ${a.categories} categories, ${a.snapshots} snapshots${result.skippedDuplicateEntries ? ` · skipped ${result.skippedDuplicateEntries} duplicate entries` : ""}.`,
        );
      } catch (err) {
        setMsg(`Merge failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  function restoreBackup() {
    const b = storage.peekBackup();
    if (b.entries.length === 0 && b.recurring.length === 0 && b.meta.categories.length === 0) {
      setMsg("Backup is empty.");
      return;
    }
    try {
      storage.importAll(JSON.stringify({ version: 2, ...b }));
      hydrate();
      setMsg("Backup restored.");
    } catch (err) {
      setMsg(`Restore failed: ${(err as Error).message}`);
    }
  }

  function splitwisePicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseSplitwiseCSV(String(reader.result));
        if (result.members.length === 0 || result.rows.length === 0) {
          setMsg("Splitwise CSV looks empty or malformed.");
          return;
        }
        const yashCol = result.members.find((m) => m.toLowerCase().includes("yash"));
        setParsed(result);
        setUserColumn(yashCol ?? result.members[0]);
        setAccountId(liveAccounts[0]?.id ?? "");
        setMsg(null);
      } catch (err) {
        setMsg(`Parse failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  function runSplitwiseImport() {
    if (!parsed || !userColumn || !accountId) return;
    const result = importSplitwiseRows(parsed.rows, { userColumn, accountId });
    const s = result.skipped;
    const lent =
      s.paidForOthers > 0
        ? ` · you fronted ${formatEUR(result.paidForOthersCents)} for others across ${s.paidForOthers} row${s.paidForOthers === 1 ? "" : "s"} (not added to ledger)`
        : "";
    setMsg(
      `Imported ${result.imported.length} (skipped: ${s.zero} zero, ${s.payment} payment, ${s.nonEur} non-EUR, ${s.duplicate} duplicate${s.other ? `, ${s.other} other` : ""})${lent}.`,
    );
    setParsed(null);
    setUserColumn("");
    setAccountId("");
  }

  function cancelSplitwise() {
    setParsed(null);
    setUserColumn("");
    setAccountId("");
    setMsg(null);
  }

  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl italic mb-4">Data</h2>
      <p className="font-display italic text-sage mb-4">
        Everything is stored locally in your browser. A backup of your previous state is kept after every write.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportNow}
          className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={() => mergeRef.current?.click()}
          className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
          title="Add entries / accounts / recurring without overwriting existing data"
        >
          Merge JSON
        </button>
        <button
          type="button"
          onClick={restoreBackup}
          className="font-mono text-xs uppercase tracking-widest border border-rust text-rust px-3 py-2 hover:bg-rust hover:text-paper"
        >
          Restore backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importPicked(f);
            e.target.value = ""; // allow re-picking same file
          }}
        />
        <input
          ref={mergeRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) mergePicked(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="font-mono text-xs text-sage mt-3">{msg}</p>}

      <div className="mt-8 pt-6 border-t border-hairline">
        <h3 className="font-display text-xl italic mb-2">Splitwise CSV</h3>
        <p className="font-display italic text-sage mb-4">
          Imports only the rows where you owe — your personal share of group expenses you haven't paid yet. Rows where
          you fronted cash for others are skipped (those reimbursements aren't real income, and the original spend is
          already on your card). Payments, non-EUR rows, and zero-share rows are skipped too. Re-importing the same file
          does not duplicate.
        </p>

        {!parsed && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => splitwiseRef.current?.click()}
              className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper"
            >
              Import Splitwise CSV
            </button>
            <input
              ref={splitwiseRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) splitwisePicked(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {parsed && (
          <div className="border border-hairline p-4 bg-rust/5">
            <p className="font-mono text-xs text-charcoal mb-3">
              {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found · {parsed.members.length} member
              {parsed.members.length === 1 ? "" : "s"}
            </p>

            <div className="mb-4">
              <p className="font-mono text-xs uppercase tracking-widest text-sage mb-1">Preview</p>
              <ul className="font-mono text-xs text-charcoal space-y-1">
                {parsed.rows.slice(0, 3).map((r) => (
                  <li key={`${r.date}|${r.description}|${r.cost}|${r.currency}`}>
                    {r.date} · {r.description} · {r.category} · {r.cost} {r.currency}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-sage block mb-1">Your column</span>
                <select
                  value={userColumn}
                  onChange={(e) => setUserColumn(e.target.value)}
                  className="w-full font-mono text-xs border border-ink bg-paper px-2 py-2"
                >
                  {parsed.members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-sage block mb-1">Account</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full font-mono text-xs border border-ink bg-paper px-2 py-2"
                >
                  {liveAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runSplitwiseImport}
                disabled={!userColumn || !accountId}
                className="font-mono text-xs uppercase tracking-widest border border-ink px-3 py-2 hover:bg-ink hover:text-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
              <button
                type="button"
                onClick={cancelSplitwise}
                className="font-mono text-xs uppercase tracking-widest border border-rust text-rust px-3 py-2 hover:bg-rust hover:text-paper"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
