import { monthOf } from "./date";
import { newId } from "./ids";
import type { Account, Category, Entry, ID, ISOMonth, Recurring, Snapshot } from "./types";

const KEYS = {
  entries: "hausbuch:entries",
  recurring: "hausbuch:recurring",
  meta: "hausbuch:meta", // categories, accounts, snapshots
  posted: "hausbuch:posted-months",
  backup: "hausbuch:backup",
  version: "hausbuch:version",
} as const;

const VERSION = 2;

interface Meta {
  categories: Category[];
  accounts: Account[];
  snapshots: Snapshot[];
}
interface Snapshot1 {
  entries: Entry[];
  recurring: Recurring[];
  meta: Meta;
  posted: ISOMonth[];
}

function read<T>(k: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  const raw = localStorage.getItem(k);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function snapshot(): Snapshot1 {
  return {
    entries: read<Entry[]>(KEYS.entries, []),
    recurring: read<Recurring[]>(KEYS.recurring, []),
    meta: read<Meta>(KEYS.meta, { categories: [], accounts: [], snapshots: [] }),
    posted: read<ISOMonth[]>(KEYS.posted, []),
  };
}

function backup() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEYS.backup, JSON.stringify(snapshot()));
}

function write<T>(k: string, value: T) {
  if (typeof localStorage === "undefined") return;
  backup();
  localStorage.setItem(k, JSON.stringify(value));
  localStorage.setItem(KEYS.version, String(VERSION));
}

export function peekBackup(): Snapshot1 {
  return read<Snapshot1>(KEYS.backup, {
    entries: [],
    recurring: [],
    meta: { categories: [], accounts: [], snapshots: [] },
    posted: [],
  });
}

// ---- entries ----
export function getEntries(month?: ISOMonth): Entry[] {
  const all = read<Entry[]>(KEYS.entries, []);
  return month ? all.filter((e) => monthOf(e.date) === month) : all;
}

export function addEntry(e: Omit<Entry, "id">): Entry {
  const created: Entry = { id: newId(), ...e };
  const next = [...read<Entry[]>(KEYS.entries, []), created];
  write(KEYS.entries, next);
  return created;
}

export function updateEntry(id: ID, patch: Partial<Entry>): Entry {
  const all = read<Entry[]>(KEYS.entries, []);
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error(`entry ${id} not found`);
  const updated = { ...all[idx], ...patch, id };
  const next = [...all.slice(0, idx), updated, ...all.slice(idx + 1)];
  write(KEYS.entries, next);
  return updated;
}

export function deleteEntry(id: ID): void {
  const next = read<Entry[]>(KEYS.entries, []).filter((e) => e.id !== id);
  write(KEYS.entries, next);
}

// ---- recurring ----
export function getRecurring(): Recurring[] {
  return read<Recurring[]>(KEYS.recurring, []);
}
export function upsertRecurring(r: Recurring): Recurring {
  const all = read<Recurring[]>(KEYS.recurring, []);
  const idx = all.findIndex((x) => x.id === r.id);
  const next = idx < 0 ? [...all, r] : [...all.slice(0, idx), r, ...all.slice(idx + 1)];
  write(KEYS.recurring, next);
  return r;
}
export function deleteRecurring(id: ID): void {
  write(
    KEYS.recurring,
    read<Recurring[]>(KEYS.recurring, []).filter((r) => r.id !== id),
  );
}

// ---- categories / accounts / snapshots (meta) ----
function getMeta(): Meta {
  return read<Meta>(KEYS.meta, { categories: [], accounts: [], snapshots: [] });
}
function setMeta(patch: Partial<Meta>) {
  write(KEYS.meta, { ...getMeta(), ...patch });
}

export function getCategories(): Category[] {
  return getMeta().categories;
}
export function upsertCategory(c: Category): Category {
  const cats = getCategories();
  const idx = cats.findIndex((x) => x.id === c.id);
  setMeta({ categories: idx < 0 ? [...cats, c] : [...cats.slice(0, idx), c, ...cats.slice(idx + 1)] });
  return c;
}

export function getAccounts(): Account[] {
  return getMeta().accounts;
}
export function upsertAccount(a: Account): Account {
  const accs = getAccounts();
  const idx = accs.findIndex((x) => x.id === a.id);
  setMeta({ accounts: idx < 0 ? [...accs, a] : [...accs.slice(0, idx), a, ...accs.slice(idx + 1)] });
  return a;
}

export function getSnapshots(): Snapshot[] {
  return getMeta().snapshots;
}
export function addSnapshot(s: Omit<Snapshot, "id">): Snapshot {
  const created = { id: newId(), ...s };
  setMeta({ snapshots: [...getSnapshots(), created] });
  return created;
}

// ---- posted months ----
export function isPosted(m: ISOMonth): boolean {
  return read<ISOMonth[]>(KEYS.posted, []).includes(m);
}
export function markPosted(m: ISOMonth): void {
  const all = read<ISOMonth[]>(KEYS.posted, []);
  if (!all.includes(m)) write(KEYS.posted, [...all, m]);
}

// ---- export / import ----
export function exportAll(): string {
  return JSON.stringify({ version: VERSION, ...snapshot() }, null, 2);
}

export function importAll(json: string): void {
  const parsed = JSON.parse(json) as { version?: number } & Partial<Snapshot1>;
  if (parsed.version !== VERSION) throw new Error(`unsupported version ${parsed.version}`);
  if (!parsed.entries || !parsed.recurring || !parsed.meta || !parsed.posted) {
    throw new Error("malformed export");
  }
  backup();
  localStorage.setItem(KEYS.entries, JSON.stringify(parsed.entries));
  localStorage.setItem(KEYS.recurring, JSON.stringify(parsed.recurring));
  localStorage.setItem(KEYS.meta, JSON.stringify(parsed.meta));
  localStorage.setItem(KEYS.posted, JSON.stringify(parsed.posted));
  localStorage.setItem(KEYS.version, String(VERSION));
}

// ---- migrations (no-op in v1, runner is in place for v2+) ----
const MIGRATIONS: Record<number, () => void> = {
  1: () => {
    /* no-op (legacy) */
  },
  2: () => {
    /* no-op: importHash is optional, no migration needed */
  },
};

export function runMigrations(): void {
  if (typeof localStorage === "undefined") return;
  const fromRaw = localStorage.getItem(KEYS.version);
  let from = fromRaw ? Number.parseInt(fromRaw, 10) : VERSION;
  while (from < VERSION) {
    MIGRATIONS[from + 1]?.();
    from++;
    localStorage.setItem(KEYS.version, String(from));
  }
}
