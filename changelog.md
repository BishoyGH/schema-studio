# Change Log
All notable changes to Schema Studio.

## Session 1 - [2025-10-09]
### Added
- Created `handover.md` with complete feature backlog organized by priority (critical → fancy), each feature paired with corresponding tests
- Created `CHANGELOG.md` as the master record of all future changes
- `AGENTS.md` with repo-specific instructions and tech stack

## Session 2 - [2025-10-09]
### Updated
- Expanded `handover.md` from 17 to 28 features (F-01–F-28):
  - **PWA & Offline (F-06–F-09)**: manifest/installability, service worker/app shell, offline-first CRUD, offline UX + action queue
  - **Mobile-First & Touch (F-10–F-12)**: 320px-first responsive design, 44px touch targets, gestures (swipe/long-press/pull-to-refresh), mobile bottom-tab navigation
  - **Themes & i18n (F-17–F-20)**: dark/light/system themes, theme registry with planned popular themes (Nord, Dracula, GitHub Dark, Solarized, Monokai), full app-wide RTL, RTL + BiDi in BlockNote editor
  - Added **Explicit Non-Goals** section (no backend, no push, no analytics)
- Updated `AGENTS.md` with PWA, mobile-first, theming, and RTL rules

## Session 3 - [2025-10-09]
### Updated
- Expanded `handover.md` from 28 to 40 features (F-01–F-40):
  - **Keyboard & Command Palette (F-13–F-14)**: full keyboard-complete workflows, configurable shortcut registry, `?` help overlay, `⌘K`/`Ctrl+K` command palette over a central command registry
  - **User Settings & Configuration (F-19–F-20)**: settings screen (appearance/editor/shortcuts/data/accessibility/language), IndexedDB persistence, export/import, workspace + per-schema defaults
  - **Bring Your Own Data (F-25–F-27)**: JSON/JSONL/CSV import hub with preview, full-workspace backup/restore, schema inference from sample data
  - **Future Extensions (F-32–F-36)**: opt-in pluggable AI assistance (local model or user key), document-centric content hub, relational grid, project tracker, sandboxed local extension framework
  - Added **Naming & Architecture Guardrails** section (schema-driven core, swappable storage, no commercial product names in repo)
- Updated `AGENTS.md` with keyboard/command palette, settings, BYOD, and architecture guardrail rules

## Session 4 - [2026-10-09]
### Added
- **F-01 Project Scaffolding** (complete):
  - Vite 8 + React 19 + TypeScript 6 project, `strict: true` enabled
  - Tailwind CSS v4 via `@tailwindcss/vite` with Shadcn theme tokens (`@theme`, light/dark CSS variables); `components.json`, `cn()` util, and Shadcn `Button` in place
  - Motion configured and used in the app shell
  - Vitest + React Testing Library + jsdom wired (`src/test/setup.ts`), coverage via `@vitest/coverage-v8`
  - Playwright wired (`playwright.config.ts`, desktop Chrome + Pixel 5 projects, `test:e2e`)
  - Scripts added: `typecheck`, `test`, `test:watch`, `test:coverage`, `test:e2e`
  - App shell replaced Vite demo; updated `index.html`, favicon, README, `.gitignore`

### Tests
- [x] Smoke test `src/App.test.tsx` renders the app shell (2 passing)
- [x] Playwright e2e `e2e/smoke.spec.ts` app shell loads (chromium + mobile-chrome passing)
- [x] `lint` -> `typecheck` -> `test` -> `build` all green

### Decisions
- Kept template's Oxlint instead of ESLint (F-39 will revisit tooling standards)
- Used manual Shadcn setup (`components.json` + `cn()` + `Button`) rather than the interactive CLI
- `paths` alias without `baseUrl` (TS 6 deprecates `baseUrl`)
- Initialized Git tracking on branch `main`; added `.gitattributes` (LF normalization); set global Git identity (Bishoy Gamal <bishoygamal1992@gmail.com>); committed baseline

## Session 5 - [2026-10-09]
### Changed
- Renamed the project from `json-crud` to **Schema Studio** (npm slug `schema-studio`)
- Updated references in `package.json`, `package-lock.json`, `index.html`, `README.md`, `src/App.tsx`, `src/App.test.tsx`, `e2e/smoke.spec.ts`, `changelog.md`, `handover.md`
- Left the `AGENTS.md` "JSON Schema CRUD" capability bullet unchanged (it describes the data model, not the product name)
- Local folder path left as-is by choice; no remote configured

### Tests
- [x] Updated heading assertions in unit + e2e smoke tests to `/schema studio/i`
- [x] `lint` -> `typecheck` -> `test` all green

## Session 6 - [2026-10-09]
### Added
- **F-02 IndexedDB Storage Layer** (complete):
  - Swappable `StorageAdapter` interface and domain types (`SchemaEntity`, `RecordEntity`, inputs, `StorageError`) in `src/lib/storage/types.ts`
  - Dexie-backed, versioned implementation in `src/lib/storage/indexeddb.ts` (v1 → v2), exposing `createIndexedDbStorage()`
  - `src/lib/storage/index.ts` exposes the active adapter via `getStorage()` / `setStorage()` so the engine stays swappable behind one interface
  - Schema CRUD + record CRUD (create/read/update/delete) scoped per schema; deleting a schema cascades its records; creating a record for a missing schema throws `NOT_FOUND`
  - v2 migration adds `createdAt`/`updatedAt` indexes and backfills missing timestamps on legacy schemas and records
- Deps: `dexie` (runtime), `fake-indexeddb` (dev); `fake-indexeddb/auto` wired into `src/test/setup.ts`

### Tests
- [x] `src/lib/storage/indexeddb.test.ts`: 12 tests covering schema + record CRUD, ordering, timestamp preservation, `NOT_FOUND` handling, cascade delete, and v1 → v2 migration backfill (all with fake-indexeddb)
- [x] `lint` -> `typecheck` -> `test` (14 passing) -> `build` all green

### Decisions
- Chose Dexie over raw IDB for first-class versioned schema + migration support (`version().stores().upgrade()`); kept it behind our own `StorageAdapter` so it can be swapped later
- Migration is genuine: v1 lacked audit-timestamp indexes, so v2 backfills `createdAt`/`updatedAt` (also needed by F-29); without this, legacy rows would drop out of the new `updatedAt` index
- `deleteSchema` cascades to its records inside a single transaction to avoid orphaned data
- Tests fake only `Date` (`toFake: ['Date']`) so timestamps are deterministic while IndexedDB async still runs

## Session 7 - [2026-10-09]
### Added
- **F-03 Schema CRUD** (complete):
  - `src/lib/schemas/validation.ts`: Zod `schemaFormSchema` (name/description/draft/jsonSchema) plus a pragmatic structural JSON Schema guard (`parseJsonSchema`, `findJsonSchemaError`) and `SCHEMA_DRAFTS` options with meta-schema URIs
  - `src/lib/schemas/queries.ts`: TanStack Query hooks (`useSchemas`, `useSchema`, `useCreateSchema`, `useUpdateSchema`, `useDeleteSchema`) over `getStorage()`
  - `src/components/schemas/schema-form.tsx`: react-hook-form + `zodResolver` form with draft picker; changing draft keeps `$schema` in sync with the JSON text
  - `src/components/schemas/schema-manager.tsx`: schema list with draft/last-updated metadata, create/edit dialog, and delete confirmation dialog warning about cascade
  - Shadcn UI primitives added: `input`, `label`, `textarea`, `select`, `dialog`, `card`
  - `App.tsx` now a real shell (`QueryClientProvider` + header) rendering `SchemaManager`
- Deps: `react-hook-form`, `zod`, `@hookform/resolvers`, `@tanstack/react-query`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-dialog`

### Tests
- [x] `src/lib/schemas/validation.test.ts`: valid/invalid form cases (empty + overlong name, malformed JSON, non-object document, bad `type`, bad `required`), nested-property path errors, draft-specific defaults (11)
- [x] `src/components/schemas/schema-manager.test.tsx`: create → persists across a simulated reload (fresh storage + fresh QueryClient), delete after confirmation, invalid input surfaces errors and saves nothing
- [x] Updated `src/App.test.tsx` for the new shell (heading + "New schema" affordance)
- [x] `lint` -> `typecheck` -> `test` (31 passing) -> `build` all green

### Decisions
- Introduced TanStack Query now (ahead of F-15's table) since schemas are server-state; F-15 adds sorting/filtering/pagination on top of these hooks without touching storage
- Kept the JSON document in a plain monospace textarea for F-03; F-17 layers the rich BlockNote + raw toggle on the same form
- Structural JSON Schema validation is hand-rolled for now (no new validator dep); the real JSON → Zod bridge lands in F-04
- Draft change rewrites `$schema` only when the current text parses as an object, otherwise leaves text untouched for validation to report

## Session 8 - [2026-10-09]
### Added
- **F-04 JSON-to-Zod Bridge** (complete):
  - `src/lib/schemas/json-to-zod.ts`: hand-rolled runtime `jsonSchemaToZod()` mapper producing a Zod schema from a JSON Schema document
  - Supported keywords: `type` (including union types like `['string','null']`), `enum`, `const`, `properties`, `required`, `additionalProperties` (strict / passthrough / catchall), `items` + `minItems`/`maxItems`/`uniqueItems`, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`/`multipleOf`, `minLength`/`maxLength`/`pattern`/`format` (email, uri/url, uuid, date-time, date, time, ipv4, ipv6), `anyOf`/`oneOf`/`allOf`/`not`, and `default`
  - Unsupported keywords (e.g. `$ref`, `if`/`then`/`else`, `patternProperties`, `unevaluatedProperties`) are recorded in `unsupported[]` as human-readable notes while the schema stays best-effort — nothing is silently mis-validated
  - `compileJsonSchema()` guard throws on structurally invalid documents by reusing the F-03 structural check; boolean schemas (`true`/`false`) map to `unknown`/`never`
  - `fast-check` added as a dev dependency for property-based testing

### Tests
- [x] `src/lib/schemas/json-to-zod.test.ts`: 28 tests — primitives, string/number/array constraints, nested objects, `additionalProperties` variants, enum/const, combinators, defaults, boolean schemas, and unsupported-keyword fallback
- [x] Property-based tests (200 runs each): string length vs `min`/`max`, number range, enum membership, required-key presence, and "unsupported keyword is always reported and never throws"
- [x] `lint` -> `typecheck` -> `test` (59 passing) -> `build` all green

### Decisions
- Hand-rolled the mapper instead of pulling in `json-schema-to-zod`: keeps the offline-first bundle lean, gives full control of the unsupported-keyword fallback, and avoids a runtime dependency for a small, well-understood subset
- Kept best-effort semantics with an explicit `unsupported[]` list rather than throwing on unknown keywords, so a partially supported schema still validates what it can (the user can be warned separately)
- `default` is applied via Zod `.default()`; a property with a default is not additionally wrapped in `.optional()` so the default value is actually filled in
- `additionalProperties` defaults to passthrough (matching JSON Schema's default) rather than Zod's strip

## Session 9 - [2026-10-09]
### Updated
- Reprioritized `handover.md` — three features promoted to the very top of the backlog, marked **TOP PRIORITY**:
  - **F-05 Schema Editor — Tabbed (Builder default + Raw JSON)**: create/edit dialog gets two tabs; Builder is the default, the existing raw JSON editor stays fully functional as the power-user path (F-03's raw editing is never removed), shared form state in both directions, invalid raw JSON blocks save without corrupting builder state, keyboard/RTL-complete tab control
  - **F-06 Visual Schema Builder (user-friendly schema creator)**: no-code field editor (types, constraints, nested objects/arrays, required toggles, defaults, live JSON Schema preview), round-trips existing schemas, preserves unsupported constructs with an "advanced — edit in Raw JSON" badge, seeded later by schema inference
  - **F-07 GitHub Actions CI (all kinds of testing)**: `.github/workflows/ci.yml` with lint, typecheck, unit, coverage gate, production build, Playwright e2e (desktop Chromium + Pixel 5), PWA/offline e2e, Lighthouse PWA audit, axe accessibility, bundle-size check, artifact uploads, actionlint, README badge, required status checks
- Backlog renumbered **F-01–F-40 → F-01–F-42** so the new features sit at F-05–F-07 (immediately after the four completed features) instead of at the end:
  - old F-05 → F-08, F-06 → F-09, F-07 → F-10, F-08 → F-11, F-09 → F-12, F-10 → F-13, F-11 → F-14, F-12 → F-15, F-13 → F-16, F-14 → F-17, F-15 → F-18, F-16 → F-19 (all +3)
  - old F-17 (schema editor, BlockNote + JSON view) → **merged into new F-05**
  - old F-18 → F-20 … old F-40 → F-42 (all +2)
  - Note: F-IDs quoted in changelog entries from sessions 1–8 use the pre-renumber scheme
- `README.md`: status range now F-01–F-42; Planned Features lists schema authoring and CI first

## Session [Session Number] - [Date]
### Feature Implementation
- [ ] Feature title here (from handover.md)
- [ ] Feature description

### Tests
- [ ] Unit tests for [feature]
- [ ] Integration tests for [feature]
- [ ] Visual/e2e tests for [feature]

### Bug Fixes
- [ ] [Brief description]

### Changelog
- Session summary: what was accomplished, blockers, decisions made

---
*Note: Copy the section structure above for every new session. Replace bracketed placeholders with actual content before closing the session. Reference the exact handover.md item numbers being worked on.*
