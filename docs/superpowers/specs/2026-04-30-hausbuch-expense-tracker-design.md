# Hausbuch — design spec

**Date:** 2026-04-30
**Status:** v1 (MVP) design, ready for plan
**Author:** Yash Suhagiya

## Premise

A personal expense tracker that reads like a typeset monthly journal. The month *is* the dashboard — there is no separate transactions list, no charts tab, no analytics page. Past months are archived pages, browseable like a notebook.

Solo use. EUR-first. Berlin-context defaults. Brand is **Hausbuch** (German for household ledger); the UI is English with German used as seasoning, not vocabulary.

## Brand and tone

Locked in via brainstorm screens (kept in `.superpowers/brainstorm/174513-1777567763/content/`):
`welcome.html`, `aesthetic-direction.html`, `brand-system.html`, `tone-revision.html`, `screens.html`.

**Visual tokens** (Tailwind v4 custom theme):

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F5F1E8` | page background |
| `--paper-2` | `#EFEAD8` | secondary surface |
| `--ink` | `#1B2A3B` | body type, primary borders |
| `--charcoal` | `#2C2417` | expense amounts |
| `--rust` | `#B85C3C` | accent, primary action, "today", recurring marker |
| `--sage` | `#5A6B7E` | secondary type, labels |
| `--green` | `#2D5A3D` | income amounts |
| `--hairline` | `rgba(27,42,59,0.15)` | dotted/hairline rules |

Background carries a faint horizontal ruling (28px line every 95% transparent → 5% ink at 4% opacity) — the "ruled paper" effect.

**Type system** (loaded via `next/font`):

- **Fraunces** (italic, opsz variable) — display, amounts, page titles. Italic by default for the editorial feel.
- **Geist** — UI body, labels, navigation.
- **Geist Mono** — tabular numbers, dates, uppercase metadata labels (`KEY · LIKE · THIS`).

Tabular numerals via `font-feature-settings: 'tnum' on` everywhere amounts appear.

**Tone of language:** English carries the UI. German appears only in four places, deliberately:

1. The product name (**Hausbuch**).
2. A single italic German line on the cover/welcome.
3. The optional **Monatsabschluss** label when a month closes (post-v1 feature; reserve the word).
4. Number and date formatting: `1.234,56 €` · `06.04.2026` (de-DE `Intl` format).

Everything else — categories, settings, errors, empty states — is English. The user feels the German DNA without having to read it.

**Motion:** restrained. `motion` library is in scope, but only for page-load reveals (entries fading in line by line on first paint, charts drawing once on mount). No scroll-triggered animation. No hover-jiggle. No micro-bounce on save.

## Information architecture

Three routes. That's the whole app.

| Route | Purpose |
|---|---|
| `/` | Current month page (the dashboard). Redirects internally to `/m/<current-YYYY-MM>`. |
| `/m/[YYYY-MM]` | Any month, same page template. Keyboard `j` / `k` and on-page `← →` arrows step prev/next. Future months render with recurring entries *projected* (computed in memory, not persisted) — see Recurring auto-posting. |
| `/settings` | Single page with stacked sections: Recurring · Categories · Accounts · Snapshots · Data (export/import). No sub-routes. |

A floating "+" rust square in the bottom-right of the month page opens the **New entry** sheet (modal on desktop, bottom sheet on mobile). Keyboard shortcut `n`.

## The month page (the dashboard)

Single template, used for every month. Top to bottom:

1. **Page head** — `← previous month`, centred italic Fraunces title `April 2026.`, right-aligned `Balance · €1,847.30`, `next month →`. Below: small italic chapter line (`Shared flat · Berlin · day 22 of 30`). The chapter line is computed from the (default, single) chapter; renders as today's date inside the month.
2. **Stats strip** — four cells separated by hairline rules: `In`, `Out`, `Net`, `Daily, remaining`. Each shows a number + a one-line delta (`vs March: +€204` / `8 days to month-end`).
3. **Flow chart** — daily bar chart, 30 bars, income above the line, expenses below, today bar in rust. Empty days render as a dotted hairline at zero. Recharts.
4. **Entries** — reverse-chronological list. Recurring entries marked with a rust dot in the gutter. The current day's entries highlighted with a faint rust wash.
5. **Where it went** — category breakdown bars, two-column grid, click to filter the entries above. Each row: name, opacity-scaled bar, total.
6. **Closing panel** — pinned at bottom. Reads "Monthly close — opens at 30.04. A short narrative summary of April will be written here." with a `Pending` stamp. The narrative auto-write is post-v1; the panel is present in v1 with a placeholder.
7. **Floating + (FAB)** — opens the New entry sheet.

Past months: same template, same data, "Closing panel" replaced by the actual close summary if one exists, otherwise the same `Pending` placeholder.

Future months: same template; entries section shows projected recurring entries (computed from templates, not written to storage) plus any manual future entries; flow chart shows the projected recurring bars; stats strip shows projected values. Projections render with a slightly faded rust dot to distinguish from real, posted recurrings.

## New entry sheet

The math-amount field is the only feature that takes thought. Everything else is conventional form UI.

| Field | Behaviour |
|---|---|
| **Amount** | Free-text input. As you type, a safe expression evaluator parses `+ - * / ( )` and decimals (no `eval`, no globals). The result renders inline to the right as `= € 26.20` in rust. On save, the resolved number is stored; the original expression is *not* persisted. Invalid expressions show no result and disable Save. |
| **Category** | Chip selector. Active chip is ink-on-paper. Last chip is `+` to add new (opens a small inline input). |
| **Date** | Defaults to today. Native date picker on tap. |
| **Account** | Hidden if only one account exists; shown as a chip row otherwise. Defaults to last-used. |
| **Note** | Optional single-line input. |
| **Sign** | Implicit from category kind (`income` → positive, `expense` → negative). No sign toggle in the UI. |

Save commits the entry, closes the sheet, and the new row animates into place at the top of the entries list.

## Data model

```ts
type ISODate  = string  // 'YYYY-MM-DD'
type ISOMonth = string  // 'YYYY-MM'

type Entry = {
  id: string
  date: ISODate
  amount: number          // EUR cents, signed (negative = expense)
  categoryId: string
  accountId: string
  note?: string
  source: 'manual' | 'recurring'
  recurringId?: string    // set if source='recurring'
  postedForMonth?: ISOMonth   // set if source='recurring' — idempotency key
  chapterId: string       // reserved for future Eras feature; defaults to 'current'
}

type Recurring = {
  id: string
  label: string
  amount: number          // signed, EUR cents
  categoryId: string
  accountId: string
  dayOfMonth: number      // 1..28; days 29-31 clamp to last-day-of-month
  startMonth: ISOMonth
  endMonth?: ISOMonth     // exclusive end; undefined = ongoing
}

type Category = {
  id: string
  label: string
  kind: 'income' | 'expense'
  color?: string          // optional override; defaults derived from kind
  archived: boolean
}

type Account = {
  id: string
  label: string
  kind: 'giro' | 'cash' | 'savings' | 'credit'
  archived: boolean
}

type Snapshot = {
  id: string
  date: ISODate
  accountId: string
  balance: number         // EUR cents, signed
}
```

**Money is integer cents.** No floats in the data layer. The math evaluator works on decimal strings, multiplies by 100 at save.

**Chapters are reserved.** Every entry carries `chapterId: 'current'` from day one. No UI for chapters in v1. When Eras lands, no data migration is needed.

**No `Recurring.variant`.** A recurring entry auto-posts. If we later want quick-add presets, that's a separate `Preset` type — not a mode on `Recurring`.

## Recurring auto-posting

Eager, idempotent, and bounded to the past + present. Future months are *projected* in memory but never written until they become the current month.

**On app boot (and on midnight rollover):**

1. Determine `currentMonth` from today's date.
2. For every month `M` in `[earliestRecurringStart, currentMonth]` not in `postedMonths`:
   - Read all `Recurring` where `startMonth ≤ M < endMonth` (or `endMonth` undefined).
   - For each, check whether an entry exists with `recurringId = R.id` and `postedForMonth = M`.
   - If not, create it: `date = clamp(M, R.dayOfMonth)` where `clamp` snaps days 29-31 to the month's last day; all other fields from `R`; `source: 'recurring'`.
   - Mark `M` posted (`postedMonths.add(M)`) and persist.

**On future-month navigation:** the page is rendered using the persisted entries for `M` *plus* a virtual list of recurring entries computed from the templates (same fields, no `id`, flagged as projected). Projected entries render exactly like real ones but with a slightly faded rust dot. They are not written to storage. When the user lands on month `M` after it becomes current, the boot routine commits them.

**Editing a posted entry** just edits the entry — there is no "detach" concept. The `recurringId` link stays for traceability.

**Editing a `Recurring` template** only affects future months — past months keep what they had. Deleting a `Recurring` is the same: no retroactive change. (Future projections recompute on every render, so changes appear immediately for unposted months.)

**Manual duplicates:** if a user manually creates an entry that duplicates an auto-post (same day, same recurring), no automatic dedup — they'll see two rows, the recurring one marked with the rust dot, and can delete one.

## Storage

**v1: `localStorage`, accessed via a flat module.**

`lib/storage.ts` exports plain functions:

```ts
getEntries(month: ISOMonth): Entry[]
addEntry(e: Omit<Entry, 'id'>): Entry
updateEntry(id: string, patch: Partial<Entry>): Entry
deleteEntry(id: string): void
getRecurring(): Recurring[]
upsertRecurring(r: Recurring): Recurring
deleteRecurring(id: string): void
getCategories(): Category[]
upsertCategory(c: Category): Category
getAccounts(): Account[]
upsertAccount(a: Account): Account
getSnapshots(): Snapshot[]
addSnapshot(s: Omit<Snapshot, 'id'>): Snapshot
exportAll(): string  // JSON
importAll(json: string): void
isPosted(month: ISOMonth): boolean
markPosted(month: ISOMonth): void
```

**No `Repository` interface in v1.** When Postgres becomes real, we extract one then. Today's storage layer is a single file of plain functions over four keys: `hausbuch:entries`, `hausbuch:recurring`, `hausbuch:meta`, `hausbuch:posted-months`.

**Automatic backup:** every write also writes to `hausbuch:backup` (the previous full snapshot). On import or import-failure, the backup is recoverable.

**Schema versioning:** every key includes a `version: 1` header. A migration runner reads the version on boot and runs `migrations[version → version+1]` in sequence. v1 ships with the runner and a no-op v1 migration in place — so v2 onward only needs to add a function.

## State

Zustand store with three slices: `entries`, `recurring`, `meta` (categories + accounts + snapshots + posted-months). The store hydrates from `localStorage` on mount and writes through on every mutation. Selectors compute month views and stats; nothing computed is persisted.

## Charts

Recharts. Two charts in v1:

- **Monthly flow** — `BarChart` with vertical bars per day, custom shape so empty days render as dotted hairlines and today renders in rust.
- **Category breakdown** — not Recharts — just CSS bars (a div with width-percent), since the design wants the bars to read as ruled lines, not as a chart widget.

Net worth chart over snapshots is a `LineChart`, but lives only on `/settings` under the Snapshots section in v1.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict |
| Styling | Tailwind v4 with custom Hausbuch theme tokens |
| Fonts | Fraunces, Geist, Geist Mono via `next/font/google` |
| Charts | Recharts |
| Motion | `motion` library, page-load reveals only |
| State | Zustand |
| PWA | `next-pwa` — installable manifest, offline-capable since storage is local |
| Tests | Vitest unit, Playwright happy-path E2E |
| Hosting | Vercel free tier |

## v1 scope

Concrete acceptance for shipping v1:

- [ ] Add / edit / delete entries via the New entry sheet
- [ ] Math expression evaluator in the amount field (safe parser, not `eval`)
- [ ] Current month page (the dashboard described above) renders fully
- [ ] Prev/next month navigation via on-page arrows and `j`/`k` keys
- [ ] `/m/[YYYY-MM]` direct URL works for any month, past or future
- [ ] Recurring entries (auto-post, eager, idempotent per month)
- [ ] Settings page with sections: Recurring · Categories · Accounts · Snapshots · Data
- [ ] Snapshots: per-account balance entry; Net worth `LineChart` from snapshots
- [ ] JSON export and import; automatic backup on every write
- [ ] PWA: installable, offline-capable
- [ ] Hausbuch brand fully expressed (typography, colour, ruled-paper background, italic numbers, Geist Mono labels, German tagline on welcome)
- [ ] de-DE number/date formatting throughout

## Deferred (not v1)

| Version | Item |
|---|---|
| v1.1 | CSV import — DKB / N26 / Sparkasse parsers; user to confirm which they actually use |
| v1.2 | Search and filter across all months |
| v1.3 | Monthly close ritual — auto-generated narrative summary |
| vNext | Eras (life chapters); UI for `chapterId` |
| vNext | Cross-device sync (Postgres swap behind storage module) |
| vFuture | Multi-user / joint mode (when married) |
| vFuture | Receipt photo capture |
| vFuture | Multi-currency |

## Open questions for plan-time

These are not blocking the design — they're choices the implementation plan will need to settle:

1. **Empty-state seed:** does v1 ship with a starter set of categories (Groceries / Cafe / Dining / Transit / Housing / Subs / Income — the ones in the mockup), or does the user create them on first use? Recommend: ship the starter set, all editable.
2. **Account on first run:** create one default `giro` account silently, or force the user through a one-step onboarding? Recommend: silent default, surface in Settings.
3. **The "Daily, remaining" stat** — what does it use for the budget baseline? Net income for the month? A user-set monthly budget? Recommend v1: average daily spend so far × remaining days, no budget concept yet.
4. **Locale fixed or detected?** de-DE formatting is locked, but the user themselves may not be in Berlin. Recommend: fixed de-DE for v1; locale switch is post-v1.

## What this spec deliberately doesn't say

- It doesn't break work into tasks or order — that's the writing-plans skill's job.
- It doesn't pin file paths beyond `lib/storage.ts` — let the plan derive the rest from Next.js App Router conventions.
- It doesn't specify component decomposition — same reason.
- It doesn't specify test cases — the plan will derive them from the v1 scope checklist.
