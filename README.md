# Schema Studio

Offline-first, schema-driven JSON CRUD app. Frontend-only PWA — all data lives in the browser (IndexedDB). No required network dependency (an optional user-provided backend connection is a designed-for future extension).

The core is schema-driven: schemas and records are grouped under user-created workspaces, every schema/record carries an auto-generated id with reference fields and referential integrity, and each view is a renderer over the same schema + records model. Storage stays swappable behind a single interface so the app can grow into larger product modes without rewrites.

## Status

> Early development. Feature status mirrors the phased backlog in `handover.md` (F-01–F-48).

| Done | Next (Phase 1.5) | Planned |
| --- | --- | --- |
| F-01 Project scaffolding, F-02 IndexedDB storage, F-03 Schema CRUD, F-04 JSON→Zod bridge, F-05 Tabbed schema editor, F-06 Workspaces, F-07 Record CRUD, F-07a Form preview | F-07b Rich text field + editor, F-12 Visual schema builder, F-12a Advanced validation rules | F-08 → F-48 |

### Implemented

**F-01 Project scaffolding**

- Vite + React + TypeScript with strict mode
- Tailwind CSS v4 with a Shadcn-based theme token system
- Motion for animation
- Vitest + React Testing Library (unit/integration) and Playwright (e2e) wired up
- Basic app shell

**F-02 IndexedDB storage layer**

- Versioned Dexie database behind a swappable `StorageAdapter` interface (`getStorage()` / `setStorage()`)
- Schema + record CRUD, per-schema records, cascade delete, `StorageError` handling
- v1 → v2 migration with timestamp backfill
- Tested with `fake-indexeddb`

**F-03 Schema CRUD**

- Create, edit, and delete JSON schemas via a dialog form (`react-hook-form` + `zod` resolver)
- Delete confirmation dialog with cascade warning
- JSON Schema draft picker (2020-12, 2019-09, draft-07) that keeps `$schema` in sync
- Structural validation of the schema document (types, `properties`, `required`, `items`, `enum`) with inline field errors
- TanStack Query data hooks (`useSchemas` + create/update/delete mutations) over the storage adapter
- Schema list with draft label and last-updated timestamp, plus empty/loading/error states

**F-04 JSON Schema → Zod bridge**

- `jsonSchemaToZod()` hand-rolled runtime mapper (`src/lib/schemas/json-to-zod.ts`) covering `type` (incl. union types), `required`, `properties`, `additionalProperties` (strict/passthrough/catchall), `items` + array bounds/uniqueness, `enum`/`const`, string (`minLength`/`maxLength`/`pattern`/`format`), number (`minimum`/`maximum`/exclusive bounds/`multipleOf`), `anyOf`/`oneOf`/`allOf`/`not`, and `default`
- Unsupported keywords are collected in `unsupported[]` (best-effort schema is still returned); `compileJsonSchema()` throws on structurally invalid documents
- Tested with unit + `fast-check` property-based tests (59 tests total)

**F-05 Tabbed schema editor (Builder + Raw JSON)**

- The create/edit dialog now has two tabs over one shared form state: **Builder** (default) and **Raw JSON**
- Raw JSON tab keeps the full F-03 editing experience (monospace textarea, draft `$schema` sync, structural validation) and now reports parse errors with line/column
- Builder tab offers no-code field editing (add/remove/reorder fields, name, type, required, description, `additionalProperties`) while preserving constructs it does not understand and flagging them as "advanced — edit in Raw JSON"
- Switching tabs never loses content; invalid Raw JSON blocks saving, shows a positioned error, and leaves the Builder showing the last valid schema (with a "Restore last valid" action)
- Last-used tab persists in IndexedDB (new settings store, `StorageAdapter.getSetting`/`setSetting`, Dexie v2 → v3); keyboard-complete tab control (`role="tablist"`, arrows/Home/End, `Ctrl/Cmd+Alt+1|2`)
- "Preview changes" shows a line diff of the schema document before saving

**F-06 Workspaces**

- Workspaces group schemas (and their records) under one container; every schema/record carries a `workspaceId`
- Storage contract gains `listWorkspaces` / `getWorkspace` / `getDefaultWorkspace` / `createWorkspace` / `updateWorkspace` / `deleteWorkspace` plus `listSchemas(workspaceId)` and `listAllRecords(workspaceId?)`; Dexie v3 → v4 backfills existing data into a default workspace
- Workspace CRUD UI: header switcher (native Radix Select, keyboard accessible) with create/rename/delete and an optional color; deleting a workspace cascades its schemas + records atomically
- The default workspace has a fixed id, is created on demand, and cannot be deleted; the active workspace is persisted in settings and falls back to the default if the stored id is stale
- Schema list and creation are now workspace-scoped, with empty/loading/error states per workspace
- Tested with `fake-indexeddb` (migration + scoping + cascade) and integration tests for the switcher flows

**F-07 Record CRUD against a schema**

- Dynamic record form generated from the schema with `react-hook-form` + a runtime Zod schema (the F-04 bridge): scalars/`enum` map to native controls, nested objects/arrays get a JSON editor for now (proper `object`/`array` authoring + nesting arrives with F-12; the builder now explains each field type inline)
- Real-time per-field validation with inline errors (resolver round-trips through the same F-04 bridge the write path uses)
- Create/edit/delete records via TanStack Query hooks, per-schema in IndexedDB and scoped to the current workspace; record list with a label derived from the schema's first scalar field, plus create/edit/delete dialogs
- **Write-path validation**: every adapter handed to `getStorage()` is wrapped by `withRecordValidation`, so `createRecord`/`updateRecord` reject data that does not match its schema (`StorageError` `VALIDATION`) — raw import paths cannot persist invalid records
- **Schema defaults applied on create**: `default` keywords are prefilled in the form and filled in again at the storage boundary, so they can never be lost
- Schema cards now drill into a Records view (with a back link); tested with `fake-indexeddb` (unit + write-path + full lifecycle)

**F-07a Schema form & validation preview**

- Live preview panel inside the schema editor (visible on the Builder and Raw tabs) renders the record form the current schema produces — the same F-04→F-07 engine the record screen uses
- Interactive validation shows the write-path-equal field errors as you type; auto-fill buttons load a valid sample (or a deliberately invalid one so errors light up)
- Paste a record blob to validate it against the schema with errors mapped to fields; `unsupported[]`/advanced keyword fields degrade to a generic input flagged "advanced — not validated"
- Read-only live JSON Schema mirror; an invalid schema disables the preview cleanly with the raw parse error and never blocks editing (debounced via `useDeferredValue` for large schemas)
- Deterministic sample-data generator (`generateSampleData`/`generateInvalidSampleData`) that respects lengths, bounds, `multipleOf`, `enum`/`const`/`default`, formats, nesting, and `minItems`

## Planned Features

Grouped by dependency (each phase builds on the previous); see `handover.md` for the full, test-paired backlog.

- **Phase 1 — Data model & core CRUD (F-08–F-10)**: schema list+search with a global record index, record browser, offline-first operations (record CRUD F-07 already done)
- **Phase 1.5 — Authoring UX essentials (F-07a–F-12a, immediate priority)**: live schema form + validation preview (F-07a), rich text / block content field type with a BlockNote editor (F-07b), the full visual schema builder incl. `object` nesting + `array` items (F-12), and advanced/conditional validation rules (F-12a). Promoted ahead of F-08 because authoring is hard to use without them
- **Phase 2 — Automated quality gate (F-11)**: GitHub Actions running lint, typecheck, unit, coverage gates, production build, Playwright e2e, PWA/offline e2e, Lighthouse PWA audit, axe accessibility, dependency audit, bundle-size, and the Edge-Case Sweep
- **Phase 3 — Schema authoring (F-14–F-15)**: auto ids + ObjectId-style reference fields with referential integrity (F-14), calculated/formula fields incl. rollups (F-14a), schema inference (F-15)
- **Phase 4 — Cross-cutting UX (F-16–F-25)**: app settings (incl. offline profile + first-run onboarding), user/workspace defaults, dark/light/system themes + theme registry, full RTL (incl. rich editor), localization/i18n, keyboard-complete workflows, command palette, undo/redo
- **Phase 5 — BYOD (F-26–F-31)**: import/export (JSON/JSONL/CSV), import hub, streaming backup/restore, data management (duplicate/bulk/trash), versioning & history, local sharing + multi-tab conflict policy
- **Phase 6 — Mobile, PWA & polish (F-32–F-38)**: 320px-first layout, 44px touch targets, gestures, bottom-tab navigation, installable manifest, service worker, offline UX + action queue, app-like polish
- **Phase 7 — Quality (F-39–F-42)**: resilience, client-side security/privacy, tooling, test coverage
- **Future extensions** (design-for, not built): relational grid, project tracker, document-centric content hub, opt-in AI assistance, local extension framework, optional user-provided backend connection (`backend.md` documents features + endpoints when that work starts)

## Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Motion
- **Forms & validation**: React-hook-form, Zod
- **Data & state**: TanStack Query, TanStack Table
- **UI**: Shadcn UI, BlockNote (planned — arrives with the rich text field, F-07b)
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
  components/schemas/ # Schema CRUD UI (tabbed form, builder, diff, list, manager)
  components/workspaces/ # Workspace switcher + CRUD dialogs
  lib/             # Shared utilities (cn, etc.)
  lib/schemas/     # Schema validation (Zod), JSON→Zod bridge, diff, query hooks
  lib/workspaces/  # Workspace query hooks + active-workspace resolution
  lib/settings/    # Persisted app settings hooks (IndexedDB)
  lib/storage/     # Swappable storage layer (IndexedDB via Dexie)
  test/            # Vitest setup
  App.tsx          # App shell
e2e/               # Playwright end-to-end tests
docs/edge-cases.md # Edge-Case Canon (tested at every phase boundary)
handover.md        # Feature backlog (F-01–F-48, phased) and session checklist
backend.md         # Created when backend work starts (future F-48); features + endpoints
changelog.md       # Per-session change log
```
