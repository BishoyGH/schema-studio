# Schema Studio

Offline-first, schema-driven JSON CRUD app. Frontend-only PWA — all data lives in the browser (IndexedDB). No backend, no network dependency.

The core is schema-driven: every view is a renderer over the same schema + records model, and storage stays swappable behind a single interface so the app can grow into larger product modes without rewrites.

## Status

> Early development. Feature status mirrors the backlog in `handover.md` (F-01–F-40).

| Done | In progress | Planned |
| --- | --- | --- |
| F-01 Project scaffolding | — | F-02 → F-40 |

### Implemented (F-01)

- Vite + React + TypeScript with strict mode
- Tailwind CSS v4 with a Shadcn-based theme token system
- Motion for animation
- Vitest + React Testing Library (unit/integration) and Playwright (e2e) wired up
- Basic app shell

## Planned Features

Grouped by category; see `handover.md` for the full, test-paired backlog.

- **Critical CRUD**: IndexedDB storage layer, JSON Schema CRUD, JSON Schema → Zod bridge, record CRUD
- **PWA & Offline**: installable manifest, service worker/app shell, offline-first operations and UX
- **Mobile-first & touch**: 320px-first layout, 44px touch targets, gestures, bottom-tab navigation
- **Keyboard & command palette**: keyboard-complete workflows, shortcut registry, command palette
- **Data management**: schema/record browsing, editor, import/export, BYOD (JSON/JSONL/CSV), schema inference
- **Settings, themes & i18n**: app/workspace defaults, dark/light/system themes, theme registry, full RTL (incl. rich editor)
- **Quality**: resilience, client-side security/privacy, tooling, test coverage
- **Future extensions** (design-for, not built): optional AI assistance, document-centric content hub, relational grid, project tracker, local extension framework

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Motion
- **Forms & validation**: React-hook-form, Zod
- **Data & state**: TanStack Query, TanStack Table
- **UI**: Shadcn UI, BlockNote
- **Persistence**: IndexedDB (browser-side)
- **PWA**: vite-plugin-pwa / Workbox (planned)
- **Testing**: Vitest, React Testing Library, Playwright

## Getting Started

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # Production build (tsc -b + vite build)
npm run preview        # Preview production build
npm run lint           # Oxlint
npm run typecheck      # tsc -b
npm run test           # Vitest (unit/integration)
npm run test:watch     # Vitest watch
npm run test:coverage  # Vitest with coverage
npm run test:e2e       # Playwright (install browsers first: npx playwright install)
```

## Project Structure

```
src/
  components/ui/   # Shadcn UI components
  lib/             # Shared utilities (cn, etc.)
  test/            # Vitest setup
  App.tsx          # App shell
e2e/               # Playwright end-to-end tests
handover.md        # Feature backlog (F-01–F-40) and session checklist
changelog.md       # Per-session change log
```
