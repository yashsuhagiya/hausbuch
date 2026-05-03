import { decimalToCents } from "./money";
import { mapSplitwiseCategory } from "./splitwise-categories";
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

export interface ImportPlan {
  /** Entries ready to be added to the ledger; ids will be assigned at commit time. */
  entries: Omit<Entry, "id">[];
  skipped: {
    zero: number;
    payment: number;
    nonEur: number;
    duplicate: number;
    paidForOthers: number;
    other: number;
  };
  // Running total of what you fronted for others (positive shares, in cents).
  // Not added to the ledger — surfaced as visibility only.
  paidForOthersCents: number;
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

// FNV-1a — non-cryptographic dedup hash, stable across runs.
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

/**
 * Compute the import plan: which Splitwise rows should become Entries,
 * which should be skipped (and why), and how much the user fronted
 * for others as flavor text. Pure: takes existing entries, returns a
 * plan; does not touch the store.
 *
 * The caller decides whether to commit (currently the data-section
 * UI runs commitImportPlan unconditionally, but a preview surface
 * could now live between plan and commit).
 */
export function planSplitwiseImport(
  rows: SplitwiseRow[],
  opts: ImportOptions,
  existingEntries: Entry[],
): ImportPlan {
  const plan: ImportPlan = {
    entries: [],
    skipped: { zero: 0, payment: 0, nonEur: 0, duplicate: 0, paidForOthers: 0, other: 0 },
    paidForOthersCents: 0,
  };

  const seenHashes = new Set(existingEntries.filter((e) => e.importHash).map((e) => e.importHash as string));

  for (const row of rows) {
    if (row.category === "Payment") {
      plan.skipped.payment++;
      continue;
    }
    if (row.currency !== "EUR") {
      plan.skipped.nonEur++;
      continue;
    }
    const yourShareStr = row.shares[opts.userColumn];
    if (yourShareStr === undefined) {
      plan.skipped.other++;
      continue;
    }
    const yourShare = Number.parseFloat(yourShareStr);
    if (!Number.isFinite(yourShare) || Math.abs(yourShare) < 0.005) {
      plan.skipped.zero++;
      continue;
    }
    // Splitwise share semantics:
    //   negative = you owe (you consumed but haven't paid yet) → import as expense
    //   positive = others owe you (you fronted cash, reimbursement coming) → skip
    // Skipping positives avoids double-counting bills already in your card statement.
    if (yourShare > 0) {
      plan.skipped.paidForOthers++;
      plan.paidForOthersCents += decimalToCents(yourShare);
      continue;
    }
    const hash = rowHash(row, opts.userColumn);
    if (seenHashes.has(hash)) {
      plan.skipped.duplicate++;
      continue;
    }

    plan.entries.push({
      date: row.date,
      amount: decimalToCents(yourShare),
      categoryId: mapSplitwiseCategory(row.category),
      accountId: opts.accountId,
      note: row.description,
      source: "manual",
      chapterId: "current",
      importHash: hash,
    });
    seenHashes.add(hash);
  }

  return plan;
}

export interface ImportResult {
  imported: Entry[];
  skipped: ImportPlan["skipped"];
  paidForOthersCents: number;
}

/** Apply an ImportPlan via the store's addEntry. The only impure bit. */
export function commitImportPlan(plan: ImportPlan, addEntry: (e: Omit<Entry, "id">) => Entry): ImportResult {
  const imported = plan.entries.map((e) => addEntry(e));
  return { imported, skipped: plan.skipped, paidForOthersCents: plan.paidForOthersCents };
}
