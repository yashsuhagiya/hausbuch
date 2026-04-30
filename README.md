# Hausbuch

A personal expense tracker that reads like a typeset monthly journal. The month is the dashboard.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # Vitest
pnpm e2e          # Playwright (browsers required)
pnpm build && pnpm start
```

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4 with custom theme tokens, `next/font` (Fraunces · Geist · Geist Mono), Zustand v5, Recharts, motion, Vitest, Playwright, Biome (lint + format).

## Routes

- `/` → redirects to current month
- `/m/[YYYY-MM]` → the month page (the dashboard)
- `/settings` → recurring · categories · accounts · snapshots · data

Keyboard shortcuts on the month page: `j` previous month · `k` next month · `n` new entry.

## Storage

Everything lives in `localStorage`, accessed via the flat module at [src/lib/storage.ts](src/lib/storage.ts). Each write captures the previous full snapshot in `hausbuch:backup` so the **Restore backup** button in Settings → Data can recover from a bad import. Schema is versioned via `runMigrations()` (no-op in v1).

## Spec and plan

- [docs/superpowers/specs/2026-04-30-hausbuch-expense-tracker-design.md](docs/superpowers/specs/2026-04-30-hausbuch-expense-tracker-design.md)
- [docs/superpowers/plans/2026-04-30-hausbuch-v1.md](docs/superpowers/plans/2026-04-30-hausbuch-v1.md)

## Known v1 limitations

- **PWA service worker**: not installed yet. The app has a web manifest and is installable, but offline caching is deferred. `next-pwa` is not yet Turbopack-compatible (Next 16). When workbox + Turbopack ship together, add a service worker.
- **PWA icons**: `public/icon-192.png` and `public/icon-512.png` are 1×1 placeholder PNGs. Replace with real icons before any user-facing release.
- **Playwright host platform**: chromium binary doesn't support ubuntu26.04-x64. The E2E test runs on supported CI images (or any host where `pnpm dlx playwright install chromium` succeeds).

## Deferred (post-v1)

| Version | Item |
|---|---|
| v1.1 | CSV import (DKB / N26 / Sparkasse parsers) |
| v1.2 | Search and filter across all months |
| v1.3 | Monthly close ritual — auto-generated narrative |
| vNext | Eras (life chapters); UI for `chapterId` |
| vNext | Cross-device sync (Postgres swap behind storage module) |
| vFuture | Multi-user / joint mode |
| vFuture | Receipt photo capture |
| vFuture | Multi-currency |

## Brand

The visual language is "ruled paper, ink type, italic numbers". Tokens are defined in [src/app/globals.css](src/app/globals.css) under `@theme`:

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#F5F1E8` | page background |
| `--color-ink` | `#1B2A3B` | body type, primary borders |
| `--color-rust` | `#B85C3C` | accent, primary action, "today" |
| `--color-sage` | `#5A6B7E` | secondary type, labels |
| `--color-green` | `#2D5A3D` | income amounts |
| `--color-charcoal` | `#2C2417` | expense amounts |

Type roles:

- **Fraunces** italic — display, amounts, page titles
- **Geist** — body, navigation
- **Geist Mono** — tabular numbers, dates, uppercase labels
