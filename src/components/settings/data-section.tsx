"use client";
import { useRef, useState } from "react";
import * as storage from "@/lib/storage";
import { useStore } from "@/lib/store";

export function DataSection() {
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrate = useStore((s) => s.hydrate);

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

  function restoreBackup() {
    const b = storage.peekBackup();
    if (b.entries.length === 0 && b.recurring.length === 0 && b.meta.categories.length === 0) {
      setMsg("Backup is empty.");
      return;
    }
    try {
      storage.importAll(JSON.stringify({ version: 1, ...b }));
      hydrate();
      setMsg("Backup restored.");
    } catch (err) {
      setMsg(`Restore failed: ${(err as Error).message}`);
    }
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
      </div>
      {msg && <p className="font-mono text-xs text-sage mt-3">{msg}</p>}
    </section>
  );
}
