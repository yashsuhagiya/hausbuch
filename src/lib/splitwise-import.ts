import { decimalToCents } from "./money";
import { mapSplitwiseCategory } from "./splitwise-categories";
import { useStore } from "./store";
import type { Entry, ID, ISODate } from "./types";

export interface SplitwiseRow {
  date: ISODate;
  description: string;
  category: string;
  cost: string;
  currency: string;
  shares: Record<string, string>; // member name → signed decimal string
}

export interface ParsedSplitwise {
  members: string[];
  rows: SplitwiseRow[];
}

export interface ImportOptions {
  userColumn: string;
  accountId: ID;
}

export interface ImportResult {
  imported: Entry[];
  skipped: {
    zero: number;
    payment: number;
    nonEur: number;
    duplicate: number;
    other: number;
  };
}

// --- CSV parsing (handles quoted fields with commas) ---
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const MEMBER_COLUMN_OFFSET = 5; // Date,Description,Category,Cost,Currency,<members...>

export function parseSplitwiseCSV(raw: string): ParsedSplitwise {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { members: [], rows: [] };

  const header = parseCSVLine(lines[0]);
  if (header.length < MEMBER_COLUMN_OFFSET) {
    return { members: [], rows: [] };
  }
  const members = header.slice(MEMBER_COLUMN_OFFSET);

  const rows: SplitwiseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < MEMBER_COLUMN_OFFSET) continue;

    const description = cols[1].trim();
    if (description === "Total balance") continue; // footer

    const shares: Record<string, string> = {};
    members.forEach((m, idx) => {
      shares[m] = cols[MEMBER_COLUMN_OFFSET + idx]?.trim() ?? "0.00";
    });

    rows.push({
      date: cols[0].trim(),
      description,
      category: cols[2].trim(),
      cost: cols[3].trim(),
      currency: cols[4].trim(),
      shares,
    });
  }
  return { members, rows };
}

// --- Hashing for idempotency ---
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Sync hash — stable across runs, simple FNV-1a (sufficient for dedup, not cryptographic).
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function rowHash(row: SplitwiseRow, userColumn: string): string {
  const yourShare = row.shares[userColumn] ?? "0.00";
  return fnv1a(`${row.date}|${row.description}|${yourShare}|${row.category}`);
}

// --- Import runner ---
export function importSplitwiseRows(rows: SplitwiseRow[], opts: ImportOptions): ImportResult {
  const result: ImportResult = {
    imported: [],
    skipped: { zero: 0, payment: 0, nonEur: 0, duplicate: 0, other: 0 },
  };

  const state = useStore.getState();
  const existingHashes = new Set(state.entries.filter((e) => e.importHash).map((e) => e.importHash as string));

  for (const row of rows) {
    if (row.category === "Payment") {
      result.skipped.payment++;
      continue;
    }
    if (row.currency !== "EUR") {
      result.skipped.nonEur++;
      continue;
    }
    const yourShareStr = row.shares[opts.userColumn];
    if (yourShareStr === undefined) {
      result.skipped.other++;
      continue;
    }
    const yourShare = Number.parseFloat(yourShareStr);
    if (!Number.isFinite(yourShare) || Math.abs(yourShare) < 0.005) {
      result.skipped.zero++;
      continue;
    }
    const hash = rowHash(row, opts.userColumn);
    if (existingHashes.has(hash)) {
      result.skipped.duplicate++;
      continue;
    }

    const created = state.addEntry({
      date: row.date,
      amount: decimalToCents(yourShare),
      categoryId: mapSplitwiseCategory(row.category),
      accountId: opts.accountId,
      note: row.description,
      source: "manual",
      chapterId: "current",
      importHash: hash,
    });
    result.imported.push(created);
    existingHashes.add(hash);
  }

  return result;
}

// helper kept for potential future async hashing; not used now
export { sha256Hex };
