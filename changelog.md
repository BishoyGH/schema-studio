# Change Log
All notable changes to Schema Studio.

## Session 19 - [2026-10-10]
### Added
- **F-53 Compact SaaS Design System v2** — the F-49 primitives are now compact and consistent app-wide:
  - `src/index.css`: new `text-2xs` micro-label step (11px), `success`/`warning`/`info` color tokens (light + dark), `--overlay` token, one **indigo** primary/ring/accent, `--radius: 0.5rem`, base `body` at `0.875rem/1.5`, and six `--swatch-*` tokens replacing the ad-hoc workspace hex swatches
  - Shared primitives resized to compact density with a `<md` touch bump back to ≥44px: `button` (`h-8`/`h-9`/`size-8`, default + sm + lg + icon), `input`/`textarea` (`h-8`), `select` trigger (`h-8`/`h-7`), `tabs` list (`h-9`), `card` (`gap-4 py-4`, `text-sm` title, `px-4`), `table` head (`h-9`), `dialog` (`p-5`, `text-base` title), `dropdown-menu` items (`max-md:min-h-11`)
  - `badge`: new `success`/`warning`/`info` variants; `skeleton`: `bg-accent` → `bg-muted` (dark-contrast fix)
  - Shell density: sidebar `w-56`, header `h-12`, RTL-safe indigo active-nav indicator in `app-nav.tsx`; page `PageHeader` title `text-2xl` → `text-xl`, section gap `gap-5`
  - Token-only colors: replaced `text-amber-500` with `text-warning`, workspace hex swatches with `var(--swatch-*)`, `bg-black/50` with `bg-overlay`, `text-white` with `text-destructive-foreground`, and physical utilities (`right-4`/`right-2`/`pl-2`/`pr-8`) with logical ones (`end-4`/`end-2`/`ps-2`/`pe-8`) — app-wide, incl. skeletons (`rounded-xl` → `rounded-lg`)

### Tests
- [x] `src/components/ui/design-system.test.tsx` (new, 10): compact primitive density (`h-8`/`h-9`/`size-8` + `max-md:h-11`/`max-md:size-11`/`min-h-16`), `success`/`warning`/`info` badges, token-only static scan (no hex, no Tailwind palette colors, no physical spacing/positioning), and a mobile density regression asserting ≥44px targets below `md`
- [x] `lint` → `typecheck` → `test` (182 passing across 20 files) → `build` all green (lint/build emit known warnings only)
- [x] Edge-Case Canon: **UI-05** and **A11Y-04** test refs filled (`design-system.test.tsx`)

## Session 18 - [2026-10-10]
### Added (planning docs only — no code changed this session)
- **F-53 Compact SaaS Design System v2**: the F-49 primitives are refined from a roomy default into a compact, professional SaaS density applied app-wide — base `14px/1.5` / meta `12px` / micro `11px`, `h-8`/`h-9` controls, `16px` card padding, `text-xl` page titles, `0.5rem` radius, a single **indigo** accent token, `success`/`warning`/`info` tokens, token-only colors (no hex), and ≥44px targets on `<md`. Landed first in the backlog so F-54/F-12 are built in their final visual home
- **F-54 Schema Editor — Three-Pane Studio**: sticky header; left **fields outline** (drag/type/name/required/advanced + search + drag/keyboard reorder + multi-select + pinned Schema settings row); center **field detail** (Basics/Validation/Advanced via the field-type registry; nested `object`/`array` via breadcrumb; type palette); right **Inspector** (`Preview / JSON / Notes`); **Builder | Raw** control
- **F-12 Visual Schema Builder — architecture locked**: outline + detail inspector driven by a new **field-type registry** (`src/lib/schemas/field-types/`, `OptionDescriptor`/`FieldTypeDefinition`) so new types/options plug in without layout changes
- **F-07c Rich Editor — Code-Block Syntax Highlighting**: add `@blocknote/code-block` (`^0.55.0`), wire `syntaxHighlighter` + `createCodeBlockSpec(codeBlockOptions)` into `blocknote-editor.tsx`, match light/dark theme, keep it in the lazy BlockNote chunk, RTL-aware language selector
- **F-08 expanded**: the schema-list redesign (header + toolbar with search/sort/Table|Grid toggle + dense rows + row overflow menu) is now part of F-08
- Edge-Case Canon: **UI-05** (tokens/logical-props scan), **UI-06** (builder usable at 50+ fields), **A11Y-04** (compact density still ≥44px at 320px), **THEME-03** (code highlighting matches mode), **DAT-18** (code-block JSON round-trip)

### Decisions
- **Locked design-system values**: compact SaaS density applied **app-wide** (not just new pages); one **indigo** accent; tokens-only (CSS variables, no hardcoded hex); logical properties for RTL
- **Schema editor = three-pane studio** (outline · detail · Inspector) with Raw JSON still first-class via a Builder | Raw control
- **Builder = outline + detail inspector + field-type registry**, so the taxonomy scales to many fields/types; search, drag/keyboard reorder, and multi-select are first-class
- **F-53 → F-54 → F-12 → F-12a** is the new P0 order (design system first, then the studio that hosts the builder, then the builder itself); **F-07c** is P1
- New feature IDs **F-53**, **F-54**, **F-07c** appended (IDs stay immutable/never renumbered); F-08 and F-12 blocks expanded in place

### Edge Cases
- Added canon entries **UI-05**, **UI-06**, **A11Y-04**, **THEME-03**, **DAT-18** (test refs `TBD`, to be filled by the implementing session)

## Session 17 - [2026-10-10]
### Added
- **F-49 Design System Primitives + Theme Toggle**:
  - Added the shell's missing Shadcn primitives: `badge`, `separator`, `tooltip`, `dropdown-menu`, `sheet`, `skeleton`, `avatar`, `table`, `scroll-area`
  - `src/components/app/theme-provider.tsx` (`ThemeProvider`) + `theme-toggle.tsx` (`ThemeToggle`): dark/light/system mode persisted via `appearance.theme` setting; applies the `dark` class + `color-scheme` on `<html>`; `system` tracks `prefers-color-scheme` live through a media-listener effect
- **F-50 App Shell & Routing**:
  - `src/router.tsx`: TanStack Router tree — `/` (redirect via `resolveActiveWorkspaceId`) · `/w/$workspaceId` layout route (AppShell, `beforeLoad` validates the workspace and falls back to default) · dashboard / schemas / schemas.new / schemas.$schemaId.edit / records / records.new / records.$recordId.edit / workspaces.new / workspaces.$workspaceId.edit / settings · NotFoundPage
  - `createAppRouter(history?)` factory + singleton `router`; `src/App.tsx` now composes `QueryClientProvider` → `ThemeProvider` → `RouterProvider` and accepts an optional `router` prop for tests (default export restored, `main.tsx` unchanged)
  - `src/components/app/app-shell.tsx`: persistent sidebar (Dashboard · Schemas · Settings) on desktop with mobile slide-over nav (sheet), top bar with workspace switcher, search affordance, theme toggle, profile menu; deleted the old `workspace-switcher` component (functionality moved into the shell)
- **F-52 Page-Based Editors**:
  - `src/layouts/workspace-layout.tsx` + editor pages: `src/pages/schema-editor.tsx`, `record-editor.tsx`, `workspace-editor.tsx`, `schemas.tsx`, `records.tsx` — sticky header/save bars, two-pane schema editor (name/description/draft + Builder|Raw tabs + live preview rail), record form sections, deep-linkable edit routes; deleted the dialog-based `schema-manager` / `record-manager` components
- **F-51 Dashboard**: `src/pages/dashboard.tsx` — stat cards (schemas/records/fields), recent schemas with record-count badges, quick actions, empty-workspace state
- `src/test/render-app.tsx`: deterministic test harness (memory history + `createAppRouter`) for route-level tests

### Tests
- [x] `src/components/app/theme-toggle.test.tsx` (new, 2): light ↔ dark ↔ system cycle persists across a remount; `system` follows a controlled `matchMedia` OS change; manual mode stops following the OS
- [x] `src/pages/dashboard.test.tsx` (new, 2): empty-workspace state + quick action navigation; stats/recent-schemas reflect stored data
- [x] `src/pages/workspaces.test.tsx` (moved from `workspace-switcher.test.tsx`, +2): full creation flow through the editor pages, rename/delete, scoping, stale-selection repair, unknown `$workspaceId` deep link falls back to default
- [x] `src/pages/schemas.test.tsx` (new, 5) + `records.test.tsx` (new, 3): CRUD through page routes, validation blocks save, deep-link edit opens the entity prefilled, browser back/forward between routes
- [x] `src/App.test.tsx` rewritten for the shell; `e2e/smoke.spec.ts` updated: brand + resolved default-workspace heading
- [x] `lint` -> `typecheck` -> `test` (172 passing across 19 files) -> `build` all green (lint/build emit known warnings only)
- [x] Edge-Case Canon updated: STO-10U (unknown `$workspaceId` deep link), STO-10/UI-02/THEME-01 references point at the new test files
### Added
- **F-07b Rich Text / Block Content field type + BlockNote editor**:
  - Introduces the `x-schema-studio` extension namespace via `src/lib/schemas/extension.ts` (`SCHEMA_STUDIO_KEY`, `RICH_TEXT_KIND`, `readSchemaStudioExtension`, `readUnknownExtensionKind`, `isRichTextField`, `richTextFieldSchema`); a rich text field is `{ "type": "array", "x-schema-studio": { "kind": "richText" } }`
  - `src/lib/records/rich-text.ts`: `emptyRichTextDocument`/`normalizeRichTextDocument`/`isRichTextDocument`/`richTextPlainText` (block-document helpers + plain-text flatten for list labels)
  - `src/components/records/blocknote-editor.tsx` (`BlockNoteEditorControl`) and `src/components/records/rich-text-field.tsx` (`RichTextField`): the editor is **lazily loaded** via `React.lazy` + `Suspense` so the BlockNote bundle only downloads when a rich text field is edited; follows `document.documentElement.dir` (default `ltr`) with an explicit override
  - `@blocknote/core` + `@blocknote/react` + `@blocknote/shadcn` (`^0.55.0`) dependencies; `@source` added in `index.css` so Tailwind v4 scans the shadcn-styled editor components
- F-04 bridge: `jsonSchemaToZod` recognises the `x-schema-studio` keyword, maps `richText` -> `z.array(z.unknown())` (loosely validated blocks), and pushes unknown `kind` values to `unsupported[]` instead of mis-validating
- `describeRecordFields` gains a `richText` kind; `recordDefaults` prefills an empty block document; `record-manager` labels/summaries flatten rich text to plain text
- Builder type picker (F-05 slice) exposes `richText` and authors the extension in the generated JSON; loading a rich text field back into the builder no longer flags it as an advanced keyword
- Sample-data generator produces a valid rich text document (and an invalid variant) for preview auto-fill

### Tests
- [x] `src/lib/schemas/extension.test.ts` (new, 5): read/malformed/null namespace, unknown-kind reporting, `richTextFieldSchema()` round-trip
- [x] `src/lib/records/rich-text.test.ts` (new, 4): empty document, normalization, plain-text flatten, junk tolerance
- [x] `src/components/records/rich-text-field.test.tsx` (new, 4): lazy render with stored document, undefined repair, `onChange` propagation, `dir` resolution + override (BlockNote module mocked)
- [x] `src/components/records/blocknote-editor.test.tsx` (new, 1): real BlockNote editor mounts in jsdom and renders stored block content
- [x] `json-to-zod.test.ts` (+3): richText -> array mapping, object-nested richText, unknown kind -> `unsupported[]`
- [x] `validation.test.ts` (+3): richText descriptor kind, non-document rejection, empty-document default validates
- [x] `sample-data.test.ts` (+2): generated rich text validates; invalid variant fails on `body`
- [x] `storage/validated.test.ts` (+2): lossless unicode/bold block round-trip; non-document write rejected, nothing persisted
- [x] `record-manager.test.tsx` (+1): rich text create -> save -> reload; list label from scalar field + rich text summary; persisted block JSON re-opens in the editor
- [x] `schema-form.test.tsx` (+2): author `richText` in the builder -> Raw JSON contains `x-schema-studio`/`richText`; existing rich text field re-loads into the builder without an advanced badge
- [x] `schema-preview.test.tsx` updated: BlockNote module mocked; advanced-keyword assertion uses `$ref`, `content` treated as recognised richText (8 passing)
- [x] Hardened a pre-existing timing flake in `workspace-switcher.test.tsx` ("renames the active workspace") by `waitFor`-ing the aria-label update
- [x] `lint` -> `typecheck` -> `test` (171 passing across 17 files) all green

### Decisions
- Represent rich text as an **array of blocks** rather than an object/string so it inherits the F-04 array mapping and reads naturally in the Raw tab; the `x-schema-studio` namespace is introduced here for F-14's `id`/`reference` to reuse
- **Lazy-load** the editor (heavy dependency) behind `React.lazy`/`Suspense` with a `data-testid="rich-text-loading"` fallback, so schemas without rich text never pay the bundle cost and offline precaching (F-36) can target it precisely
- Keep block validation loose (`z.array(z.unknown())`) at the F-04 layer; the editor owns block-shape correctness, the storage boundary still rejects a non-array value, so invalid data can never persist
- Editor theme/direction read from the document now (honouring `dir`) with full theming (F-18) and BiDi audit (F-21) deferred to their features

### Edge Cases
- **DAT-13** test refs filled (lossless block round-trip + create->reload); added **DAT-17** (rich text value that is not a block document must be rejected at the write path)

## Session 15 - [2026-10-10]
### Added
- **F-07a Schema Form & Validation Preview** (complete; F-07b/F-14 field types render via the shared engine until they land):
  - `src/components/schemas/schema-preview.tsx`: a **live preview panel** in the schema editor, visible on both Builder and Raw tabs, that renders the record form the current schema produces via the F-04 bridge + F-07 engine (`useDeferredValue` debounces recompiles for large schemas)
  - **Interactive validation**: typing sample values shows the same inline field errors the real record form shows (asserted equal to the write-path messages)
  - **Auto-fill sample data** + **invalid variant** buttons (valid/forcing-error samples from the schema) that light expected errors up front
  - **Validate pasted data**: paste a record blob → Zod validates it → errors map to fields, with `unsupported[]`/advanced-keyword fields degraded to a generic input flagged "advanced — not validated"
  - **Read-only live JSON Schema mirror** so authors watch the raw JSON update while editing the Builder; the Raw tab stays the editable copy
  - Invalid/partial schema → preview disables cleanly with the raw parse error and never blocks editing; toggle is keyboard-complete (`aria-expanded`/`aria-controls`), RTL-safe, 44px targets
- `src/lib/schemas/sample-data.ts`: `generateSampleData`/`generateInvalidSampleData` respecting constraints (lengths, bounds, `multipleOf`, `enum`/`const`/`default`, `format`), nesting objects, and filling arrays to `minItems`
- `src/lib/schemas/preview.ts`: `schemaUnsupportedNotes`/`fieldAdvancedNotes` (per-field "advanced — not validated" flags)
- `RecordForm` gains opt-in `validateOnMount` and a `bare` mode (no nested `<form>` when embedded in the schema editor) plus an `onInvalid` callback so embedded consumers see write-path-equivalent failures

### Tests
- [x] `src/lib/schemas/sample-data.test.ts` (12): valid sample validates, constraints respected, nesting/arrays/enum/default/union/const/null, known-properties-only, invalid variant fails per-field, graceful wildcard/boolean degradation, and a **fast-check** (100 runs) that generated samples always validate
- [x] `src/components/schemas/schema-preview.test.tsx` (8): all field types + mirror, live update on schema change, field errors equal the write path, valid auto-fill passes, invalid auto-fill lights errors, pasted-data errors + advanced flags, non-object paste rejection, clean disable on invalid schema
- [x] `src/components/schemas/schema-form.test.tsx` (3 new): keyboard toggle visible on both tabs, live preview updates as the schema is edited, preview disables cleanly on a raw parse error
- [x] `lint` -> `typecheck` -> `test` (155 passing) -> `build` all green

### Decisions
- Reused the real `RecordForm` (same engine + resolver the record screen uses) instead of a parallel "fake preview", so preview errors are by construction the ones the write path rejects
- Added `bare` mode + `onInvalid` to `RecordForm` rather than copying the form: embedding a `<form>` inside the schema editor's `<form>` is invalid HTML, and `handleSubmit` otherwise drops invalid results
- Sample generation is deterministic and constraint-aware (defaults/`enum`/`const` win); unparseable `pattern` falls back gracefully rather than failing auto-fill
- Ordered the F-07a handover entry item-by-item; the F-14 `id`/`reference` and F-07b rich-text renderers are forward-degraded ("advanced — not validated") until those field types exist

### Edge Cases
- Canon `DAT-09`/`DAT-10` test refs filled; added **DAT-16** (auto-filled sample must validate; invalid sample must fail) with refs in `sample-data.test.ts`

## Session 1 - [2026-10-09]
### Added
- Created `handover.md` with complete feature backlog organized by priority (critical → fancy), each feature paired with corresponding tests
- Created `CHANGELOG.md` as the master record of all future changes
- `AGENTS.md` with repo-specific instructions and tech stack

## Session 2 - [2026-10-09]
### Updated
- Expanded `handover.md` from 17 to 28 features (F-01–F-28):
  - **PWA & Offline (F-06–F-09)**: manifest/installability, service worker/app shell, offline-first CRUD, offline UX + action queue
  - **Mobile-First & Touch (F-10–F-12)**: 320px-first responsive design, 44px touch targets, gestures (swipe/long-press/pull-to-refresh), mobile bottom-tab navigation
  - **Themes & i18n (F-17–F-20)**: dark/light/system themes, theme registry with planned popular themes (Nord, Dracula, GitHub Dark, Solarized, Monokai), full app-wide RTL, RTL + BiDi in BlockNote editor
  - Added **Explicit Non-Goals** section (no backend, no push, no analytics)
- Updated `AGENTS.md` with PWA, mobile-first, theming, and RTL rules

## Session 3 - [2026-10-09]
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

## Session 10 - [2026-10-09]
### Added
- **F-05 Schema Editor — Tabbed (Builder default + Raw JSON)** (complete modulo F-17 command-palette registration):
  - `src/components/ui/tabs.tsx`: Shadcn-style Tabs primitive over `@radix-ui/react-tabs` (new dep); keyboard-complete tablist (arrows/Home/End, `role="tablist"`/`aria-selected`)
  - `src/components/schemas/schema-builder.tsx`: no-code Builder over the shared form state — add/remove/reorder/rename fields, name/type/required/description, `additionalProperties` toggle; preserves unknown root and per-field keywords and flags them with an "advanced — edit in Raw JSON" badge; read-only fallback for non-object roots
  - `src/components/schemas/schema-diff.tsx` + `src/lib/schemas/diff.ts`: LCS line diff for the "Preview changes" panel shown before save
  - `src/lib/settings/queries.ts`: persisted settings hooks; new setting `schemaEditor.defaultTab`
  - `src/lib/schemas/validation.ts`: `positionToLineColumn()` + `describeJsonParseError()` so Raw JSON errors report line/column
  - Storage: Dexie v3 adds a key/value `settings` store; `StorageAdapter` gains `getSetting`/`setSetting`/`deleteSetting`
- `schema-form.tsx` rebuilt as a tabbed shell: shared single `jsonSchema` field, panel content kept mounted (`forceMount`) so tab switches never lose state, `Ctrl/Cmd+Alt+1|2` tab shortcuts, live Raw JSON parse error, and `$schema` draft sync intact

### Tests
- [x] `schema-form.test.tsx` (9): Builder default, persisted Raw preference, preference write-through, bi-directional Builder↔Raw sync, invalid Raw JSON blocked with line/column + Builder state preserved, keyboard arrows/Home, diff preview, and a `fast-check` property test round-tripping arbitrary schema JSON through tab switches
- [x] `validation.test.ts`: line/column parse-error and `positionToLineColumn` cases
- [x] `diff.test.ts`: LCS diff equal/added/removed and empty-input cases
- [x] `indexeddb.test.ts`: settings store CRUD + v2 → v3 migration test
- [x] F-03 regression: `schema-manager.test.tsx` updated to open the Raw JSON tab, still green
- [x] `lint` -> `typecheck` -> `test` (78 passing) -> `build` all green

### Decisions
- Kept one `jsonSchema` string as the single source of truth in react-hook-form; the Builder derives its rows from it and writes back serialized JSON, so there is no "apply" step and Raw edits show up immediately
- Builder is intentionally a minimal slice of F-06 (types + required + description + `additionalProperties`); F-06 will extend it with constraints, nesting, `enum`/`const`, and a live preview without changing the tab architecture
- When Raw JSON is invalid the Builder renders the last valid document read-only (with "Restore last valid") rather than permitting edits that would silently discard the user's half-typed JSON
- Both `TabsContent` panels use `forceMount`; this is what guarantees "switching tabs never loses content" (Radix unmounts inactive content by default, which had dropped the Builder's last-valid state)
- Added a key/value `settings` store at Dexie v3 (no backfill needed) rather than `localStorage`, honoring the "persist in IndexedDB" rule and giving F-21 a foundation
- `useSetting`'s query returns `null` (not `undefined`) for unset keys because TanStack Query v5 rejects `undefined` query data

## Session 11 - [2026-10-10]
### Updated (docs expansion — no code changes)
- Expanded `handover.md` **and reordered the entire backlog by dependency**, renumbering all unchecked features **F-06–F-48** in seven phases (data model & CRUD → CI gate → schema authoring → cross-cutting UX → BYOD → mobile/PWA/polish → quality) + future extensions. Progress marker: highest unchecked item is now picked top-down by phase.
- Added feature blocks: **F-06 Workspaces** (group schemas under one container, Dexie v3 → v4), **F-13 Schema Form & Validation Preview** (live form + validation preview: interactive, auto-fill sample, validate pasted data), **F-14 IDs & Relationships** (auto `_id` + ObjectId-style reference fields via `x-schema-studio` extension keywords, referential enforcement, relationship-aware views), **F-22 Localization/i18n**, **F-25 Undo/Redo**, **F-48 User-Provided Backend Connection** (opt-in remote `StorageAdapter`; requires `backend.md` when backend work starts).
- Expanded **F-16 App Settings** (offline user profile, disabled server-profile group for F-48, first-run onboarding) and renamed **F-17 to "User & Schema Defaults"** (avoids collision with the workspace container; default workspace + per-workspace defaults).
- Folded audit fixes into blocks: write-path record validation + schema defaults on create (F-07), global record-search index (F-08/F-24), `npm audit`/Dependabot + Edge-Case Sweep CI jobs (F-11), streaming/quota-aware export (F-28), trash/soft-delete (F-29), record re-validation on schema restore (F-30), multi-tab conflict policy (F-31), IndexedDB-survives-SW-update test (F-36), no-required-network + credentials-only-in-IndexedDB rules (F-37/F-40).
- Added **"Testing Strategy: Edge-Case Sweep"** section (standing mechanism) + new reference `docs/edge-cases.md` canon (seeded, categorized; phase-exit gate wired into the Next Session Checklist).
- Revised **Non-Goals**: no built-in/managed backend, no hosted sync; optional user-provided backend is a future extension (F-48) and never a hard dependency.
- Created `docs/edge-cases.md`: Edge-Case Canon (STO/CON/OFF/DAT/I18N/A11Y/UI/Q/PERF/SW/THEME/SEC) + phase-exit checklist.
- Updated `AGENTS.md` (workspaces, ids/relationships, form preview, localization, undo/redo rules; `backend.md` requirement; non-goal wording) and `README.md` (status F-01–F-05 done + planned F-06–F-48, phased feature list, "no *required* network dependency").
- Removed the stale "Session [Session Number]" template block; normalized session dates (sessions 1–3 were dated 2025-10-09, the rest 2026-10-09).

### Changelog
- `handover.md` renumbered per Session 11. Use this mapping when reading older entries:

| old | new | old | new | old | new | old | new |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-06 | F-12 | F-15 | F-34 | F-24 | F-19 | F-35 | F-45 |
| F-07 | F-11 | F-16 | F-23 | F-25 | F-20 | F-36 | F-43 |
| F-08 | F-07 | F-17 | F-24 | F-26 | F-21 | F-37 | F-44 |
| F-09 | F-35 | F-18 | F-08 | F-27 | F-27 | F-38 | F-47 |
| F-10 | F-36 | F-19 | F-09 | F-28 | F-28 | F-39 | F-39 |
| F-11 | F-10 | F-20 | F-26 | F-29 | F-15 | F-40 | F-40 |
| F-12 | F-37 | F-21 | F-16 | F-30 | F-29 | F-41 | F-41 |
| F-13 | F-32 | F-22 | F-17 | F-31 | F-30 | F-42 | F-42 |
| F-14 | F-33 | F-23 | F-18 | F-32 | F-31 | F-34 | F-46 |
| F-33 | F-38 | new | F-06, F-13, F-14, F-22, F-25, F-48 | — | — | — | — |

### Tests
- [x] Docs-only change: `lint` -> `typecheck` -> `test` -> `build` all green

## Session 12 - [2026-10-10]
### Added
- **F-06 Workspaces** (complete; command-palette/mobile-nav integration deferred to F-24/F-34):
  - `WorkspaceEntity { id, name, color?, createdAt, updatedAt }` + `Create/UpdateWorkspaceInput`; `SchemaEntity` and `RecordEntity` gain `workspaceId` (records derive it from their schema)
  - `StorageAdapter` gains `listWorkspaces`, `getWorkspace`, `getDefaultWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`; `listSchemas(workspaceId)` replaces the unscoped list and `listAllRecords(workspaceId?)` is now workspace-scopable
  - Dexie **v3 → v4**: new `workspaces` store, `workspaceId` indexes on schemas/records, and a backfill that moves every existing row into a fixed-id default workspace (`DEFAULT_WORKSPACE_ID`)
  - Default workspace is created on demand, cannot be deleted (`StorageError` `CONFLICT`), and keeps the app usable even if the persisted active id is stale
  - Deleting a workspace cascades its schemas + records inside one transaction, leaving other workspaces untouched; creating a schema for a missing workspace throws `NOT_FOUND`
  - `src/lib/workspaces/queries.ts`: workspace query hooks + `useActiveWorkspace()` which resolves the persisted selection, falls back to the default, and repairs a stale id via the settings store (new `workspace.activeId` key)
  - `src/components/workspaces/workspace-switcher.tsx`: header switcher (keyboard-accessible Radix Select) with create/rename/delete dialogs and an optional color; `App.tsx` is now a workspace-aware shell that renders a workspace-scoped `SchemaManager`

### Tests
- [x] `indexeddb.test.ts` reworked + extended (workspace CRUD, default-workspace invariants, cascade delete, schema/record scoping isolation, `listAllRecords(workspaceId)`, and a v3 → v4 backfill migration test)
- [x] `workspace-switcher.test.tsx` (7): default workspace on first run, create + auto-activate, cross-workspace schema isolation, rename, delete-with-confirmation + fallback, default workspace never deletable, stale active-id repair
- [x] Updated `schema-manager.test.tsx` (workspace-scoped) and `App.test.tsx` (async workspace shell); `src/test/setup.ts` gained jsdom shims for Radix pointer/scroll APIs
- [x] `lint` -> `typecheck` -> `test` (95 passing) -> `build` all green

### Decisions
- Modeled the default workspace with a fixed id (`'default'`) rather than "first workspace" so the cannot-delete invariant and stale-id recovery are deterministic; `getDefaultWorkspace()` is idempotent and also runs migration-safe for fresh installs (Dexie does not run `upgrade()` when creating a brand-new DB)
- Records inherit `workspaceId` from their schema on create instead of taking it as input, so a record can never be written into a different workspace than its schema (keeps F-14 cross-workspace reference rules coherent)
- `listSchemas(workspaceId)` is required (not optional) to make workspace scoping impossible to bypass accidentally at call sites
- Kept the switcher as a self-contained widget driven by `useActiveWorkspace()` in `App`, so `SchemaManager` stays a pure prop-driven view (`key={activeWorkspace.id}` resets its dialog state on switch)
- Exposed the active workspace name through the Select trigger's `aria-label` (better a11y and deterministic tests) after finding Radix `SelectValue` does not render its text in jsdom until the menu has been opened

### Edge Cases
- Added canon entries `STO-03`/`STO-04` (default-workspace delete, cascading workspace delete), `STO-10` (stale active-workspace id repair); wired UI-02 to the new empty-state test

## Session 13 - [2026-10-10]
### Added
- **F-07 Record CRUD Against a Schema** (complete):
  - `StorageError` gains a `VALIDATION` code; `src/lib/storage/validated.ts` wraps any adapter with **write-path validation** — `createRecord`/`updateRecord` compile the record's schema and reject data that does not conform, so raw paths (future F-26/F-27 imports) can never persist invalid records; `getStorage()`/`setStorage()` always apply the wrapper
  - `src/lib/records/validation.ts`: `recordZodSchema()` / `validateRecordData()` — single source of truth built on the F-04 bridge; returns parsed data (schema `default` keywords applied) or dot-path field errors plus `unsupported[]` notes
  - `src/lib/records/fields.ts`: schema-derived field descriptors (`string`/`number`/`integer`/`boolean`/`enum`/`json`/`null`) and `recordDefaults()` for prefilling new records
  - `src/lib/records/queries.ts`: TanStack Query hooks `useRecords`, `useRecord`, `useCreateRecord`, `useUpdateRecord`, `useDeleteRecord` (workspace-scoped through the F-06 schema scoping)
  - `src/components/records/record-form.tsx`: dynamic form with `react-hook-form` + a generated Zod resolver, live per-field validation, native controls for scalars/`enum`, checkboxes for booleans, JSON editor with inline parse errors for nested objects/arrays
  - `src/components/records/record-manager.tsx`: drill-down Records view (back link, schema name, create/edit/delete dialogs, record-label from first scalar field, empty/loading/error states); `SchemaManager` schema cards gain a "Records" button
- Schema editor property-based round-trip test given an explicit 15 s timeout (it was timing out at 5 s under full-suite parallel load)

### Tests
- [x] `src/lib/records/validation.test.ts` (12): valid data, field-level dot-path errors, missing required, defaults applied on parse, non-object rejection, unsupported-keyword note without throw, field descriptors + defaults derivation
- [x] `src/lib/storage/validated.test.ts` (6): defaults applied on create, write-path rejection on create/update (with `VALIDATION` `StorageError` and field details), nothing persisted on reject, `NOT_FOUND` for missing schema/record, non-record calls pass through
- [x] `src/components/records/record-manager.test.tsx` (6): empty state, create-through-form with defaults persisted, live validation blocks invalid save, raw storage-boundary reject, edit updates, delete after confirmation
- [x] `schema-manager.test.tsx` gains a drill-in/back navigation test
- [x] Full `lint` -> `typecheck` -> `test` (120 passing) -> `build` all green

### Decisions
- Validation lives in a **decorator** (`withRecordValidation`) instead of inside the IndexedDB adapter: the storage engine stays swappable (F-48 can reuse the same guarantee), and `setStorage()` can never accidentally install an unvalidated adapter
- `validateRecordData` parses (not just checks) so `default` keywords are populated once at the storage boundary; the form additionally prefills them via `recordDefaults()`, making them visible before saving and robust even if the UI path changes
- Kept `jsonSchemaToZod` (never throws) on the write path rather than `compileJsonSchema`: schemas are already structurally validated at save (F-03), so write-path failures should only come from record data
- `enum` select values round-trip through `JSON.stringify`/`parse` so non-string enum members (numbers, booleans, `null`) are handled, not just strings
- The record form is primitive-first for F-07; nested objects/arrays use a JSON editor for now — F-12/F-13 keep the same schema + records model and expand the controls

### Edge Cases
- Canon entries `DAT-04` / `DAT-05` now have test refs (write-path rejection + defaults-on-create); added `DAT-11` (live form field error matches the write-path rejection; invalid records can never persist)

## Session 14 - [2026-10-10]
### Updated (roadmap + authoring UX; no new runtime features)
- **Reprioritized `handover.md`** to close three undocumented gaps flagged in review (rich editor ownership, `object`/`array` semantics, validation/dynamic/formula features) and to promote authoring UX to the front:
  - Added **Phase 1.5 — Authoring UX Essentials (immediate priority)** right after F-07 and **before F-08**, because the app is hard to use without a live preview and a rich text field:
    - **F-07a Schema Form & Validation Preview** — moved up from F-13; now also owns the read-only **live JSON Schema mirror** (moved from F-12). Old Phase-3 F-13 is kept only as a pointer to avoid an ID gap.
    - **F-07b Rich Text / Block Content field type + BlockNote editor** — new; introduces the `x-schema-studio` extension namespace (`kind: "richText"`) that F-14 later reuses for `id`/`reference`; adds `@blocknote/*` deps + tests.
    - **F-12 Visual Schema Builder** — elevated from Phase 3; now explicitly defines **`object` = nested named-property group** and **`array` = ordered list with an `items` schema (scalar or object) + `minItems`/`maxItems`/`uniqueItems`**.
    - **F-12a Advanced & Conditional Validation Rules** — new (`if`/`then`/`else`, `dependentRequired`/`dependentSchemas`, cross-field); routes F-04's `unsupported[]` notes here.
  - Added **F-14a Calculated / Formula Fields** after F-14 — defines the previously-ambiguous "dynamic fields" as calculated (derived, read-only) values + rollups; replaces the vague F-43-only mention; safe expression evaluation (no `eval`/`Function`) per F-40.
  - Marked Phase 3 as `(F-13–F-15)` with F-13 as a pointer; repointed editor-assumption references: F-18 (theme follows editor), F-21 (RTL in editor), F-36 (SW caches editor assets), F-45 (content field type) → **F-07b**/**F-07a**.
  - Updated the "Next Session Checklist" to call out Phase 1.5 as the immediate priority.
- **Builder UX (F-05 slice)**: `schema-builder.tsx` now shows a one-line explanation of each field type under the Type picker (wired via `aria-describedby`), with explicit hints for `object` ("Nested group of named fields (a sub-record)") and `array` ("Ordered list of values") noting that detailed nested/item setup lives in the Raw JSON tab until F-12.
- Docs sync: `README.md` (status table + phase summaries now show Phase 1.5 first; BlockNote marked planned until F-07b), `docs/edge-cases.md` (repointed DAT-09/DAT-10 → F-07a, I18N-03/THEME-01 → F-07b; added DAT-12…DAT-15 for object/array round-trip, rich text, conditional validation, calculated fields), `AGENTS.md` (Core Logic gains a "Field types" bullet for the rich text / block content field type).

### Tests
- [x] `schema-form.test.tsx`: added "explains field types, including object and array" (helper text per type + the two nested hints)
- [x] `lint` -> `typecheck` -> `test` -> `build` all green

### Decisions
- Chose **suffixed IDs** (`F-07a`/`F-07b`/`F-12a`/`F-14a`) over a full renumber so existing cross-references in `docs/edge-cases.md`, README, and the Session-11 mapping stay valid; Phase 1.5 is placed physically before F-08 so the top-down "highest unchecked item" rule schedules it next.
- Promoted the **rich text editor as early as possible** (Phase 1.5) per review: it is a first-class authoring capability, so its ownership now sits alongside the preview/builder instead of an implied future arrival in F-45 (removes the Phase-4-depends-on-F-45 inversion).
- Rich text fields use the `x-schema-studio` extension namespace (consistent with F-14) rather than a standard `format`/`contentMediaType` keyword.
