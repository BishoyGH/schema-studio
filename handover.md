# Schema Studio - Handover Document

## Application Overview
**Frontend-only PWA** (no built-in backend, no hosted server API). All data lives in the browser (IndexedDB). Manages JSON Schemas and schema-validated records with full CRUD, installable like a native app, works 100% offline, mobile-first with touch support, full keyboard + command palette, user settings, bring-your-own-data import/export, dark/light themes (+ future custom themes), and complete RTL support including the rich text editor.

Schemas and records are grouped under user-created **workspaces**, and every schema/record carries an auto-generated immutable id; records can reference one another (ObjectId-style) with enforced referential integrity. The core is schema-driven and extensible so the app can grow into larger product modes (see Future Extensions) without rewrites. A **future, optional user-provided backend connection** is designed for but not built; when backend work starts it must be documented in `backend.md`.

Stack: React + TypeScript, Vite, Tailwind CSS v4, Zod, TanStack Query + TanStack Table, Shadcn UI, Motion, React-hook-form, BlockNote, Vitest (+ Playwright for PWA/offline/keyboard e2e).

> Every feature below has matching `[TEST]` items. Do not mark a feature done until its tests exist and pass.
>
> **Edge-Case Sweep**: a standing, cross-cutting test gate runs at every phase boundary — see [Testing Strategy](#testing-strategy-edge-case-sweep). Any edge case discovered during a phase must be added to `docs/edge-cases.md` **with a test** before that phase closes.

## Naming & Architecture Guardrails
- **Repo rule**: never name commercial products in repo files. Describe future directions by category only: "document-centric workspace", "relational grid", "project tracker", "content hub". "MongoDB-style" capabilities are described as "auto-generated ids + reference fields with referential integrity", never by product name.
- Core stays **schema-driven**: every view (table, board, document, gallery) is a renderer over the same schema + records model.
- Storage engine must stay swappable behind one interface (IndexedDB today; an optional user-provided backend may implement it later — F-48).
- Every future mode must remain fully offline-capable; nothing may introduce a **hard** network dependency.
- Data-model changes (migrations) are expensive: workspace scoping and id/reference semantics (F-06, F-14) are scheduled early so later features don't cause re-migrations.

## Phase 0 — Completed (F-01 – F-05)

### F-01. Project Scaffolding
- [x] Vite + React + TypeScript project, strict mode on
- [x] Tailwind CSS v4, Shadcn UI, Motion configured
- [x] Vitest + React Testing Library wired up; Playwright for e2e
- [x] [TEST] Smoke test renders the app and passes (`npm run test`)

### F-02. IndexedDB Storage Layer
- [x] IndexedDB wrapper (Dexie) with versioned schema/object stores, behind a swappable `StorageAdapter` interface
- [x] CRUD functions: create/read/update/delete for schemas and records (delete cascades records; records require an existing schema)
- [x] Transaction error handling (`StorageError`) and upgrade/migration path (v1 → v2 → v3)
- [x] Key/value `settings` store (`getSetting`/`setSetting`/`deleteSetting`) behind the same `StorageAdapter` (v2 → v3)
- [x] [TEST] Unit tests with fake-indexeddb for all CRUD functions
- [x] [TEST] Migration tests: v1 → v2 timestamp backfill; v2 → v3 preserves data and adds the settings store

### F-03. Schema CRUD
- [x] Create/edit/delete JSON schemas (react-hook-form + Zod validation)
- [x] Delete confirmation dialogs
- [x] JSON Schema draft support (2020-12 at minimum) + draft picker
- [x] [TEST] Unit tests for schema form validation (valid + invalid schemas)
- [x] [TEST] Integration test: create schema → persists in IndexedDB after reload
- [x] Raw JSON editing must keep working forever as the power-user escape hatch (the tabbed editor + visual builder must never remove or bypass it)

### F-04. JSON-to-Zod Bridge
- [x] Convert JSON Schema → Zod schema at runtime (hand-rolled mapper in `src/lib/schemas/json-to-zod.ts`)
- [x] Fallback/error path for unsupported schema keywords (reported via `unsupported[]`, schema stays best-effort; `compileJsonSchema` throws on invalid documents)
- [x] [TEST] Property-based tests mapping common keywords (type, required, enum, min/max, pattern, nested objects, arrays)
- [x] [TEST] Tests for unsupported-keyword fallback behavior

### F-05. Schema Editor — Tabbed (Builder default + Raw JSON)
- [x] Tabbed editor shell in the create/edit schema dialog: **Builder** (user-friendly, default) and **Raw JSON**
- [x] **Builder tab is the default** on first open; last-used tab persisted in settings (F-16) so power users can pin Raw as their default
- [x] **Raw JSON tab**: the existing F-03 editor (monospace textarea today; a BlockNote-rich raw editing layer can be added later) keeps working unchanged — syntax check, draft `$schema` sync, structural validation errors inline
- [x] Both tabs are two views over the same form state: edits in Builder appear in Raw JSON instantly and vice versa (single source of truth, no "apply" step between tabs)
- [x] Switching tabs never loses content; invalid JSON in the Raw tab blocks saving and shows a parse error with line/column, and cannot corrupt the Builder state
- [ ] Tab control is keyboard-complete (arrow keys, Home/End, `role="tablist"`/`aria-selected`), RTL-aware, reachable via a command-palette action + shortcut (F-24) — keyboard + `Ctrl/Cmd+Alt+1|2` shortcut done; command-palette registration deferred to F-24 (no palette yet)
- [x] Schema diff/preview before save
- [x] [TEST] Toggle Builder ↔ Raw preserves content in both directions (property-based: arbitrary schema JSON round-trips)
- [x] [TEST] Invalid JSON in Raw tab is caught, reported with position, save blocked, Builder state intact
- [x] [TEST] Default tab = Builder for new users; persisted tab preference is honored on reopen
- [x] [TEST] Raw tab regression: F-03 create/edit/delete flow still passes with the tabbed shell in place

## Phase 1 — Data Model & Core CRUD (F-06 – F-10)
Everything downstream builds on this phase. The record model is finalized here (workspace scoping + schema defaults + write-path validation) so later features never trigger a storage re-migration or rework of core CRUD.

### F-06. Workspaces (group schemas under one container) — TOP PRIORITY
- [x] Workspace entity `{ id, name, color?, createdAt, updatedAt }`; `SchemaEntity` and `RecordEntity` gain `workspaceId`
- [x] `StorageAdapter` gains workspace-scoped queries (`listWorkspaces`, `getWorkspace`, `getDefaultWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`, `listSchemas(workspaceId)`, `listAllRecords(workspaceId?)`); Dexie migration **v3 → v4** backfills existing schemas/records into a single default workspace
- [x] Workspace CRUD UI: create/rename/delete; deleting a workspace cascades schemas + records inside one transaction; a workspace with zero schemas is valid
- [x] Default workspace invariants: fixed id, cannot be deleted, transparently (re)created on demand; active-workspace selection persisted in settings (F-16)
- [x] Workspace switcher in the header, reachable via keyboard (native Radix Select); command-palette registration (F-24) and mobile bottom-tab placement (F-34) deferred to those features
- [ ] Per-workspace defaults (default view, default sort, form layout) — ties to F-17
- [ ] Per-workspace import/export and backup options — ties to F-26/F-28
- [x] [TEST] Migration v3 → v4: all existing data preserved into the default workspace
- [x] [TEST] Scoping isolation: a schema/record is reachable only inside its own workspace
- [x] [TEST] Cascading workspace delete removes schemas + records atomically; zero-schema workspaces render empty states (F-16 onboarding)

### F-07. Record CRUD Against a Schema — TOP PRIORITY
- [x] Dynamic form generation from a selected schema (react-hook-form + generated Zod schema)
- [x] Real-time field validation + error display
- [x] Create/read/update/delete records stored per-schema in IndexedDB (scoped to the current workspace, F-06)
- [x] **Write-path validation**: record `data` is validated against its schema at the storage boundary (not only in the UI), so raw import paths (F-26/F-27) cannot persist invalid records
- [x] **Schema defaults applied on create**: `default` keywords (F-04) are applied when a record form opens / a record is created
- [x] [TEST] Unit tests: valid record saves; invalid record is rejected with correct field errors
- [x] [TEST] Storage-boundary rejection: raw invalid `data` fails `createRecord`/`updateRecord` with `StorageError`
- [x] [TEST] Integration test: full record lifecycle for a sample schema, including applied defaults and an invalid-data reject

## Phase 1.5 — Authoring UX Essentials (immediate priority, F-07a – F-12a)
These land immediately after F-07, **ahead of F-08**. The app is hard to use without a live preview and a rich text field, so both — plus the full visual builder that makes them shine — are promoted here. The file is ordered by dependency; work top-down.

### F-07a. Schema Form & Validation Preview — live "what will my form do" — TOP PRIORITY
> **Moved up** from Phase 3 (was F-13); the old F-13 entry is kept only as a pointer. The read-only live **JSON Schema mirror** moved here from F-12.
- [ ] Real-time **live panel** inside the editor (visible in both the Builder tab and Raw tab) that renders the record form the current schema produces, via the F-04 bridge + the F-07 form engine; re-renders as the schema edits (debounced for large schemas)
- [ ] **Live generated JSON Schema mirror** (read-only) so authors watch the raw JSON update as they edit the Builder; the Raw tab stays the editable copy
- [ ] Read-only mirror: preview never saves; it only shows what records will look like
- [ ] **Interactive validation**: typing sample values in the preview shows inline field errors identical to the real record form (F-07)
- [ ] **Auto-fill sample data**: a button fills a valid record sample per the current schema, and an "invalid variant" view fills one that violates constraints so errors light up
- [ ] **Validate pasted data**: paste an arbitrary record blob → Zod validates it → errors mapped to fields; passes through the same `unsupported[]` reporting (F-04)
- [ ] `unsupported[]`/advanced keyword fields degrade to a generic input flagged "advanced — not validated"
- [ ] Invalid/partial schema → preview disables cleanly with the raw parse error and never blocks editing
- [ ] Renders F-14 `id` (read-only chip) and `reference` (linked display) fields when present, and the F-07b rich-text field
- [ ] Keyboard-complete panel toggle, RTL-safe, 44px touch targets (F-33)
- [ ] [TEST] Form renders per supported types/constraints; live updates on schema edit (property-based round-trip)
- [ ] [TEST] Interactive validation matches F-07 behavior for the same values
- [ ] [TEST] Auto-fill valid passes; auto-fill invalid lights the expected field errors
- [ ] [TEST] Pasted-data validation maps errors to fields incl. `unsupported[]` flags
- [ ] [TEST] Invalid schema disables preview cleanly; preview parity with touch/keyboard audit

### F-07b. Rich Text / Block Content Field Type + BlockNote Editor — TOP PRIORITY
- [ ] New field type represented as `x-schema-studio: { "kind": "richText" }` — this **introduces the `x-schema-studio` extension namespace** that F-14 later reuses for `id`/`reference`; preserved by the Raw tab and structural validator (F-03/F-04)
- [ ] BlockNote-based editor control (new `@blocknote/*` deps) used in the record form (F-07) and the F-07a live preview; content stored as BlockNote block JSON inside the record
- [ ] F-04 bridge maps `richText` → loosely-validated block content (unknown constructs reported via `unsupported[]` rather than mis-validated)
- [ ] Builder picker (F-05 slice / F-12) exposes the field type; `describeRecordFields` (F-07) gains a `richText` kind
- [ ] Views (F-09) render rich content read-only (document/gallery renderers)
- [ ] Editor follows app theme (F-18), supports LTR/RTL + BiDi (F-20/F-21), is cached by the service worker (F-36), and round-trips through import/export (F-26/F-28)
- [ ] Keyboard-complete, 44px touch targets (F-23/F-33)
- [ ] [TEST] Rich text field: create → edit → save → reload round-trips block JSON
- [ ] [TEST] Preview (F-07a) renders the rich text control and validates it
- [ ] [TEST] RTL/BiDi content preserved; editor theme matches app theme
- [ ] [TEST] Export → import round-trips rich text content losslessly

### F-12. Visual Schema Builder (User-Friendly Schema Creator) — TOP PRIORITY
> **Boundary note**: F-05 already ships a minimal builder slice (add/remove/reorder fields, name/type/required/description, `additionalProperties`). F-12 is the **superset** — constraints, nesting, `enum`/`const` — built on the same tabs without changing the F-05 architecture. **Elevated here from Phase 3** so authors get a complete authoring loop alongside F-07a/F-07b.
- [ ] Field type picker covering the core JSON Schema types: `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`, plus `enum`/`const` value sets
- [ ] **`object` = a nested group of named properties** (a sub-record), edited inline one level at a time (breadcrumb/stack navigation for depth)
- [ ] **`array` = an ordered list**, with an `items` schema (scalar **or** object → a repeatable group) and `minItems`/`maxItems`/`uniqueItems`
- [ ] Type-aware constraint inputs: strings (`minLength`/`maxLength`/`pattern`/`format`), numbers (`minimum`/`maximum`/exclusive bounds/`multipleOf`), arrays (see above)
- [ ] `additionalProperties` toggle (root + nested)
- [ ] Field-level `default` and `description` (rendered as help text) written into the generated JSON Schema
- [ ] Loads any existing schema back into the builder: constructs the builder understands are editable; constructs it doesn't (`$ref`, `if`/`then`/`else`, `patternProperties`, combinators, etc.) are preserved untouched and surfaced as an "advanced — edit in Raw JSON" badge rather than dropped or silently mangled
- [ ] Round-trip guarantee: Builder output is valid per F-03 structural validation and compiles through F-04 `jsonSchemaToZod()`
- [ ] Exposes the `id`/`reference` (F-14) and `richText` (F-07b) field types (builder can author them; unknown-to-builder advanced keywords still preserved)
- [ ] Seeded by F-15 schema inference: inferred schema opens pre-filled in the builder for review before save
- [ ] Paired with the F-07a form/validation preview panel (same editor, shared form state)
- [ ] Fully keyboard-navigable (field rows, keyboard reorder, add-field shortcut), 44px touch targets (F-33), RTL-safe with logical properties only (F-20)
- [ ] [TEST] Builder produces structurally valid JSON Schema for every supported type/constraint combination (table-driven)
- [ ] [TEST] Round-trip: existing schema → builder → JSON → builder → JSON is lossless for supported constructs
- [ ] [TEST] Unsupported constructs survive an edit session byte-identical and are flagged as advanced
- [ ] [TEST] `object` nests and `array`-of-object round-trips; keyboard-only + touch-target audit (parity with F-23 / F-33)

### F-12a. Advanced & Conditional Validation Rules
- [ ] Conditional & cross-field rules authored in the schema and enforced in the form: `if`/`then`/`else`, `dependentRequired`, `dependentSchemas`, conditional-required, and cross-field comparisons
- [ ] F-04 bridge gains support (or an explicit best-effort mapping) for these keywords; anything it cannot yet enforce is reported via `unsupported[]` and surfaced in the F-07a preview as "advanced — not validated"
- [ ] Enforced identically in the F-07 record form (live) and at the write-path boundary (F-07 `withRecordValidation`), and shown in the F-07a preview
- [ ] Builder (F-12) can author simple conditional/required rules; complex rules degrade to the Raw JSON tab
- [ ] [TEST] Conditional rule: value violates `if`/`then` → field errors in form + preview + storage rejection
- [ ] [TEST] `dependentRequired`/`dependentSchemas` enforced; unsupported rule flags "not validated" without breaking the schema

### F-08. Schema List & Search (TanStack Query + Table)
- [ ] Server-state cache of schemas via TanStack Query (IndexedDB as the "server"), workspace-scoped (F-06)
- [ ] Table with sorting, filtering, pagination, search
- [ ] **Global record-search index** (workspace-scoped) powering cross-schema search and the command palette (F-24)
- [ ] [TEST] Query cache tests: invalidation after create/update/delete
- [ ] [TEST] Table tests: sort/filter/search produce correct rows
- [ ] [TEST] Global search finds records across schemas; unicode/partial matches handled

### F-09. Record Browser (TanStack Table)
- [ ] Table of records for the selected schema, column inference from schema properties
- [ ] Sorting/filtering/pagination on records
- [ ] [TEST] Table renders records per schema; filters isolate correctly
- [ ] [TEST] Performance test with 1k+ records

### F-10. Offline-First Data Operations
- [ ] Every CRUD operation works with zero connectivity (IndexedDB is the source of truth)
- [ ] No **required** network-dependent code paths anywhere in the app (explicit decision: no push notifications, no analytics pings — they require a server; the optional backend, F-48, is opt-in)
- [ ] [TEST] Playwright offline: full workspace + schema + record CRUD while offline
- [ ] [TEST] Data created offline survives reload and remains valid online later

## Phase 2 — Automated Quality Gate (F-11)

### F-11. GitHub Actions CI (all kinds of testing) — TOP PRIORITY, gates every merge
- [ ] `.github/workflows/ci.yml` triggered on `push` to `main` + all `pull_request`s, with concurrency cancellation of superseded runs
- [ ] **Lint job**: `npm run lint` (Oxlint)
- [ ] **Typecheck job**: `npm run typecheck` (`tsc -b`)
- [ ] **Unit/integration job**: `npm run test` (Vitest + RTL + fake-indexeddb)
- [ ] **Coverage job**: `npm run test:coverage`, failing when Vitest coverage thresholds are not met; report uploaded as an artifact
- [ ] **Production build job**: `npm run build` (`tsc -b && vite build`), `dist/` uploaded as an artifact for downstream jobs
- [ ] **E2E job**: Playwright against the built app (preview server) — desktop Chromium + mobile (Pixel 5) projects, `npx playwright install --with-deps`, CI retries, HTML report + traces uploaded on failure
- [ ] **PWA/offline e2e job**: the F-35/F-36 suites (installability, offline shell, offline CRUD) against the service-worker build
- [ ] **Lighthouse / PWA audit job** (F-35): budget-checked audit of the built app, report artifact
- [ ] **Accessibility job**: axe checks (Vitest unit-level + Playwright `@axe-core/playwright` e2e) as their own step so failures are obvious
- [ ] **Bundle-size check**: fail on unexpected growth of built assets (keeps the offline PWA lean)
- [ ] **Dependency audit job**: `npm audit` + Dependabot; license/SBOM report for shipped dependencies
- [ ] **Edge-Case Sweep job**: runs the `docs/edge-cases.md` canon + cross-feature suites (see Testing Strategy)
- [ ] Shared setup: Node LTS pinned, `actions/setup-node` with npm cache, one `npm ci` reused across jobs via cache/artifact
- [ ] Required status checks documented for branch protection on `main` (lint, typecheck, unit, coverage, build, e2e)
- [ ] Workflow lint (`actionlint`) + README status badge
- [ ] [TEST] Green run on `main` covering every job above; a deliberately broken PR turns the run red
- [ ] [TEST] Failing e2e uploads report/trace artifacts; a coverage drop blocks merge

## Phase 3 — Schema Authoring Core (F-13 – F-15)
The builder, live preview, and rich text field type were **promoted to Phase 1.5** (F-07a/F-07b/F-12/F-12a). What remains here is ids/relationships and schema inference, which build on the same editor + JSON→Zod bridge.

### F-13. Schema Form & Validation Preview — **moved to F-07a** (Phase 1.5)
> Relocated to the immediate-priority block; this entry is kept only as a pointer so the ID sequence has no gap. See **F-07a**.

### F-14. IDs & Relationships (auto ids + reference fields, ObjectId-style)
- [ ] **Auto-generated immutable unique id** (`_id`) for every schema and record, generated client-side, never reused after delete; surfaced as an `id` field type in the builder (F-12)
- [ ] **JSON Schema representation**: custom extension keywords preserved by the raw tab and validator — `x-schema-studio: { "kind": "id" }` and `x-schema-studio: { "kind": "reference", "targetSchema": "<schemaId>", "nullable": boolean }`; reuses the `x-schema-studio` namespace **introduced by F-07b** (`kind: "richText"`); F-04 bridge maps `id` → read-only `z.string()` and `reference` → optional/required `z.string()` per `nullable`
- [ ] Reference field values store target schema id + record id; **write-path validation** (F-07) rejects references to non-existent schemas/records
- [ ] **Relationship enforcement**: deleting a referenced record/schema either **blocks** (with a referrer list) or **cascades** per a configurable per-schema policy; precedence over F-02/F-07 cascade: a schema delete is blocked while referenced unless force-cascade is chosen; broken references are surfaced in the UI
- [ ] **Cross-workspace references are forbidden by default** (references must stay inside one workspace, F-06 scope)
- [ ] **Relationship-aware views**: table/board/gallery cells (F-09) resolve references to display the target record's title/identifier and provide navigation links
- [ ] Core enabler for F-43 Relational Grid Mode (linked records, rollups)
- [ ] [TEST] Id uniqueness incl. reuse-after-delete and across imports
- [ ] [TEST] Reference validation rejects missing target records/schemas at write
- [ ] [TEST] Block-vs-cascade policies behave per policy; force-cascade exposed
- [ ] [TEST] Broken references surfaced; cross-workspace references rejected
- [ ] [TEST] View resolution renders target identifiers + navigation

### F-14a. Calculated / Formula Fields (computed values)
> This defines the previously-ambiguous "dynamic fields": here it means **calculated fields** — read-only values derived from a formula, never user-entered source data. Core enabler for F-43 formulas/rollups.
- [ ] Author a **calculated field** on a schema: a read-only field whose value is computed from an expression over the record's other fields (e.g. `total = price * quantity`, concatenation, date math); stored via an `x-schema-studio` keyword
- [ ] Values are **derived, never source data**: not captured as authored input, recomputed on read/edit, excluded from required-input validation but validated as output
- [ ] **Rollups across references** (`count`/`sum`/`avg` over records linked via F-14 reference fields)
- [ ] **Safe expression evaluation** — no `eval`/`Function` on untrusted input (honors F-40); invalid formulas surface a clear schema error
- [ ] Rendered read-only in the record form (F-07), the F-07a preview, and views (F-09); recalculates live as inputs change
- [ ] Import/export: formulas travel with the schema; computed values are recomputed, never trusted from imported data
- [ ] [TEST] In-record formula computes correctly and updates live; edge cases (empty operands, division) deterministic
- [ ] [TEST] Rollup aggregates referenced records and stays correct after a referenced record is edited/deleted
- [ ] [TEST] Formula evaluation never executes arbitrary code; invalid formula flags a clear schema error
- [ ] [TEST] Round-trip: formula field exports/imports losslessly; computed value is recomputed, not trusted

### F-15. Schema Inference from Data
- [ ] Auto-infer a JSON Schema from pasted/sample data (type detection, required fields, enums, patterns)
- [ ] User edits inferred schema before saving (opens pre-filled in the F-12 builder)
- [ ] [TEST] Inference test on varied samples: nested objects, arrays, mixed types, dates
- [ ] [TEST] Inferred schema validates the source data 100%

## Phase 4 — Cross-Cutting UX Systems (F-16 – F-25)
RTL, themes, keyboard, and undo/redo are cheap to enforce early and expensive to retrofit across many views — do them before BYOD and polish phases.

### F-16. App Settings
- [ ] Settings screen with sections: appearance, editor, shortcuts, data, accessibility, language/direction, profile, server
- [ ] All settings persisted in IndexedDB; reset-to-defaults per section and globally
- [ ] Settings export/import (so users can move setups between browsers/devices)
- [ ] **Offline user profile**: name/handle/avatar stored locally (no account, no network)
- [ ] **Disabled "Server" profile group** (endpoint/auth) reserved for F-48 — shown only when a backend is connected
- [ ] **First-run onboarding**: welcome + optional demo/seed workspace so empty states teach the model
- [ ] [TEST] Change each setting → persists across reload
- [ ] [TEST] Reset restores defaults; settings export → import round-trips
- [ ] [TEST] First-run path creates a seed workspace; dismissing it keeps an empty-but-usable app

### F-17. User & Schema Defaults
> Renamed from "Workspace & Schema Defaults" to avoid collision with the F-06 Workspace container. "Workspace defaults" now explicitly means defaults that apply *inside* a workspace (per-workspace), not the container itself.
- [ ] Per-schema defaults (default view, default sort, form layout preferences)
- [ ] User-level defaults applied to new schemas
- [ ] **Default workspace** + **per-workspace defaults** (F-06) applied to new schemas inside that workspace
- [ ] [TEST] New schema inherits user defaults; per-schema overrides win
- [ ] [TEST] Changing a default doesn't mutate existing schemas unexpectedly
- [ ] [TEST] Per-workspace defaults apply only inside their workspace

### F-18. Theme System (Dark / Light / System)
- [ ] Light, dark, and system (follows `prefers-color-scheme`) modes; toggle in header/settings
- [ ] All colors via Tailwind v4 `@theme` CSS variables — no hardcoded hex in components
- [ ] Choice persisted in IndexedDB; rich text editor (BlockNote, F-07b) theme follows app theme
- [ ] [TEST] Toggle cycles light ↔ dark; system mode tracks OS change live
- [ ] [TEST] Theme persists across reload; BlockNote (F-07b) editor colors match mode

### F-19. Custom Theme Framework (Future-Proofing)
- [ ] Theme registry: themes are swappable CSS variable sets (architecture ready now, themes added later)
- [ ] Planned popular themes (backlog, not built yet): Nord, Dracula, GitHub Dark, Solarized, Monokai
- [ ] Theme picker UI (placeholder once registry exists)
- [ ] [TEST] Registering a new variable set switches the whole app without code changes
- [ ] [TEST] Contrast/accessibility check per theme (WCAG AA) in test suite

### F-20. Full RTL Support (App-Wide)
- [ ] `dir="rtl"` on `<html>` via language/direction setting; entire layout mirrors (sidebar, tables, icons, animations)
- [ ] CSS logical properties only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`) — no physical `ml`/`mr`
- [ ] RTL-aware TanStack Table (column order, scroll direction), mirrored chevron/arrow icons, `Intl` formatting for dates/numbers
- [ ] [TEST] With dir=rtl: layout snapshot matches mirrored design; tables scroll correctly
- [ ] [TEST] Static-analysis test: no physical margin/padding utilities in source

### F-21. RTL in Rich Editor (BlockNote)
> Depends on the rich text field type + editor introduced in **F-07b** (Phase 1.5).
- [ ] BlockNote content direction follows app direction; per-paragraph BiDi (Arabic/Hebrew + Latin mixed text)
- [ ] Toolbar alignment, placeholders, and keyboard flow RTL-correct
- [ ] [TEST] RTL document: text alignment, caret movement, mixed BiDi rendering
- [ ] [TEST] Switching LTR ↔ RTL mid-session preserves content and formatting

### F-22. Localization & UI Translation (i18n)
- [ ] Translation-key architecture + locale resources (no hardcoded user-facing strings)
- [ ] Locale selection in F-16 settings; each locale pairs with a direction (RTL via F-20)
- [ ] Pluralization and `Intl` number/date formatting across the app
- [ ] Missing-key fallback (locale → fallback locale → key) so a partial translation never breaks UI
- [ ] [TEST] Switching locale changes strings app-wide; numbers/dates format per locale
- [ ] [TEST] Missing-translation fallback renders gracefully; RTL locale triggers full mirror (F-20)

### F-23. Full Keyboard Support
- [ ] Complete keyboard navigation for every view: no mouse-only workflows
- [ ] Global shortcut registry (configurable bindings) with conflict detection
- [ ] Standard patterns: `?` shortcut help overlay, arrow-key table navigation, Enter/Escape in dialogs, focus traps in modals, visible focus rings
- [ ] Record editing fully keyboard-driven (field-to-field flow, save/cancel)
- [ ] [TEST] Keyboard-only e2e: create → edit → delete a record without touching the mouse
- [ ] [TEST] Shortcut registry test: rebind a key, conflict is rejected, help overlay lists all actions

### F-24. Command Palette
- [ ] `⌘K` / `Ctrl+K` palette: fuzzy search over actions, schemas, records (via the F-08 global index), settings, recent items
- [ ] Palette actions executable entirely by keyboard; recent/fuzzy ranking
- [ ] Extensible command registry so future modes register their own commands
- [ ] [TEST] Fuzzy-match test: partial query finds target action/schema/record
- [ ] [TEST] Palette works with keyboard only; Escape closes and restores focus correctly

### F-25. Undo / Redo
- [ ] History stack across the builder (F-12), raw editor (F-05), record editor (F-07), and imports (F-26): destructive/multi-step edits are undoable
- [ ] Undo/redo shortcuts (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`/`Ctrl/Cmd+Y`), registered in F-23 shortcuts
- [ ] Undo never rewrites storage silently; actions that already hit IndexedDB are undone via compensating mutations, others are in-memory
- [ ] [TEST] Undo/redo across builder, raw, record edit, and import scenarios
- [ ] [TEST] Undo after reload is safe (no dangling partial state)

## Phase 5 — Bring Your Own Data (F-26 – F-31)

### F-26. Basic Import / Export
- [ ] Import schemas/records from `.json` files (file picker, no server), scoped to the current workspace (F-06)
- [ ] Export single or all schemas/records as `.json` downloads
- [ ] Imports respect write-path validation (F-07): invalid data is reported, never partially persisted
- [ ] [TEST] Import valid file → items created; invalid file → clear error, nothing persisted
- [ ] [TEST] Export produces JSON that round-trips back through import

### F-27. Data Import Hub
- [ ] Import from multiple formats: JSON, JSONL, CSV (client-side parsing only)
- [ ] Paste raw JSON/CSV directly into an import wizard with preview before commit
- [ ] Import maps source columns/properties onto an existing or new schema
- [ ] [TEST] Import each format with valid + malformed files; malformed → clear, actionable errors
- [ ] [TEST] Large-file import (10k+ rows) stays responsive (chunked/streaming parse)

### F-28. Data Export & Backup
- [ ] Export schemas/records as JSON, JSONL, CSV; backup bundle options: **single workspace** or **all workspaces** (schemas + records + settings, F-06)
- [ ] Restore from a backup bundle with conflict/diff preview
- [ ] **Streaming / quota-aware export** of very large datasets (10k+ rows) without freezing the UI; export path honors IndexedDB quota (F-39)
- [ ] [TEST] Backup → wipe → restore reproduces the workspace(s) exactly
- [ ] [TEST] Export → re-import round-trip preserves all field types and metadata (incl. ids/references, F-14)
- [ ] [TEST] Large export streams without blocking; partial-quota failure surfaces graceful error

### F-29. Data Management
- [ ] Duplicate schema, duplicate record (preserves references, F-14)
- [ ] Bulk select + bulk delete/export of records
- [ ] **Trash / soft-delete** for records (and optionally schemas) with restore, plus a purge action; trashed items are hidden from views but backup-exported
- [ ] [TEST] Duplicate creates distinct entries with new IDs
- [ ] [TEST] Bulk ops test: N selected → all affected, toast confirms
- [ ] [TEST] Trash → restore round-trip; purge is destructive and cannot resurrect; references to trashed records are surfaced (F-14)

### F-30. Versioning & History
- [ ] Schema version history (auto-snapshot on save) + restore
- [ ] Record-level audit trail (created/updated timestamps)
- [ ] **Restore re-validation**: restoring an older schema re-validates existing records against it; records that no longer conform are flagged (not silently dropped) with a migration/revert choice
- [ ] [TEST] Restore previous version overwrites current correctly
- [ ] [TEST] Timestamps update on edit, not on read
- [ ] [TEST] Restoring a schema that invalidates records flags them and offers revert, never data loss

### F-31. Local Sharing (no backend)
- [ ] Share schema/records via exported file or clipboard deep-link (compressed JSON in URL hash)
- [ ] Same-browser tab sync via BroadcastChannel
- [ ] **Multi-tab conflict policy**: two tabs editing the same schema/record — last-write-wins with BroadcastChannel notification, no corruption, secondary tab is prompted to reload the entity
- [ ] [TEST] URL-hash import reconstructs schema losslessly
- [ ] [TEST] BroadcastChannel: write in tab A appears in tab B
- [ ] [TEST] Concurrent edits: later write wins deterministically; neither tab corrupts storage

## Phase 6 — Mobile, PWA & Polish (F-32 – F-38)

### F-32. Mobile-First Responsive Design
- [ ] Design at 320px first, then scale up (breakpoints: 320/375/768/1024/1440)
- [ ] No horizontal scroll at 320px; tables degrade to card/list layouts on small screens
- [ ] Safe-area insets (notch/home indicator) via `env(safe-area-inset-*)`
- [ ] [TEST] Layout snapshot tests at all 5 breakpoints
- [ ] [TEST] 320px viewport: zero horizontal overflow, all controls reachable

### F-33. Touch Support & Gestures
- [ ] All touch targets ≥ 44×44px; no hover-only interactions (hover as progressive enhancement)
- [ ] Swipe-to-dismiss on list rows, long-press context menus, pull-to-refresh on lists, drag-to-reorder with touch
- [ ] Haptic feedback via `navigator.vibrate` on destructive actions (where supported)
- [ ] [TEST] Touch-target size audit test (all interactive elements ≥ 44px)
- [ ] [TEST] Gesture tests: swipe dismiss, long-press menu, pull-to-refresh (Playwright touch simulation)

### F-34. Mobile App Navigation
- [ ] Bottom tab bar on mobile (Workspaces / Schemas / Records / Settings), sidebar on desktop — same routes
- [ ] App-shell layout: fixed header, no browser-chrome feel, overscroll behavior controlled
- [ ] [TEST] Mobile nav renders tabs; desktop renders sidebar; same routes resolve
- [ ] [TEST] Keyboard + screen-reader parity between mobile/desktop nav

### F-35. PWA Manifest & Installability
- [ ] `manifest.webmanifest`: name, short_name, description, icons (192/512 + maskable), `display: standalone`, theme_color, background_color, shortcuts, scope, start_url
- [ ] Splash screen via background_color + icon; `viewport-fit=cover` for notched devices
- [ ] Install prompt handling (beforeinstallprompt) + in-app "Install" affordance
- [ ] [TEST] Lighthouse PWA audit: installable, manifest valid, icons correct
- [ ] [TEST] Install flow test: prompt captured, deferred, triggered from button

### F-36. Service Worker & App Shell
- [ ] Service worker via `vite-plugin-pwa`/Workbox: precache app shell, runtime caching (stale-while-revalidate) for BlockNote assets/fonts (F-07b)
- [ ] Offline fallback page/state; cache versioning + skipWaiting/clientsClaim update flow with "new version available" UI
- [ ] **Data survives SW updates**: IndexedDB content is never lost during SW install/activate/update
- [ ] [TEST] Playwright offline emulation: app shell loads with network disabled
- [ ] [TEST] SW update test: new build → update prompt → reload applies
- [ ] [TEST] IndexedDB data survives a SW update cycle (canon ENTRY SW-01)

### F-37. Offline UX
- [ ] Persistent online/offline indicator (navigator.onLine + online/offline events)
- [ ] Action queue: mutations attempted offline are queued and auto-applied/reconciled on reconnect (future-proof for the F-48 sync engine)
- [ ] Toasts for offline/online transitions
- [ ] [TEST] Toggle offline → indicator shows; queued action applies on reconnect
- [ ] [TEST] Rapid online/offline flapping doesn't corrupt state (canon ENTRY OFF-02)

### F-38. App-Like Polish
- [ ] Standalone-mode behaviors: no pull-to-refresh browser chrome conflicts, gesture nav safe zones
- [ ] Motion animations for tab transitions, modals, toasts; skeleton loaders
- [ ] [TEST] Standalone display-mode test (Playwright PWA context)
- [ ] [TEST] Animation reduced-motion respect (`prefers-reduced-motion`)

## Phase 7 — Resilience, Security & Quality (F-39 – F-42)

### F-39. Resilience
- [ ] Error boundaries, loading/empty states, IndexedDB quota handling (incl. on export/backup, F-28)
- [ ] [TEST] Force IndexedDB failure → graceful error UI, no data corruption
- [ ] [TEST] Boundary test: a crashing component shows fallback, app stays usable

### F-40. Security & Privacy (client-side)
- [ ] Sanitize imports (no arbitrary code execution from imported JSON)
- [ ] CSP via meta tag
- [ ] **No secrets except user-provided credentials**: the only stored secrets are the user's own backend (F-48) / AI (F-46) endpoints + auth, kept in IndexedDB only and never transmitted anywhere else
- [ ] [TEST] Fuzz imported JSON; app never evals/Function() untrusted input
- [ ] [TEST] CSP header/meta present in built index.html
- [ ] [TEST] Credentials never written to logs/URLs; absent-cleartext scan on built bundle

### F-41. Tooling & Standards
- [ ] ESLint + Prettier, pre-commit hook (lint-staged)
- [ ] `npm run build` production build passes; conventional commit messages
- [ ] [TEST] `lint -> typecheck -> test` all green locally **and** in GitHub Actions (F-11)

### F-42. Test Coverage
- [ ] Coverage threshold (Vitest `--coverage`) enforced
- [ ] Edge-Case Sweep metrics: canon entries all mapped to test refs; zero untested canon entries allowed at phase exit
- [ ] [TEST] Coverage report meets threshold; no critical path untested

## Future Extensions (design-for now, build later)
F-43–F-48 are designed for and build on earlier features. Do not build until their prerequisites exist.

### F-43. Relational Grid Mode (grid/database workspace)
- [ ] Multiple view types over one schema: grid, board, gallery; linked records between schemas; formulas and rollups
- [ ] Core enabler: the F-14 relation/reference fields + F-09 view-layer decoupling from storage
- [ ] [TEST] Same record set renders correctly in each view type
- [ ] [TEST] Linked-record integrity maintained on delete/rename

### F-44. Project Tracking Mode (workflow/board workspace)
- [ ] Workflows, statuses, assignees, due dates, board/grouped views, iterations
- [ ] Core enabler: workflow field types + status transition rules expressed in schema
- [ ] [TEST] Status transitions validate against schema-defined workflow
- [ ] [TEST] Board view groups/filters without data duplication

### F-45. Content Hub Mode (document-centric workspace)
- [ ] Pages, blocks, nested documents, links between documents — a wiki-style content layer over the same schema + records model
- [ ] Core enabler: block-based content field type (F-07b; F-07a preview renders it); document renderer as a new view
- [ ] [TEST] Document mode reads/writes through the same storage interface (no new storage path)
- [ ] [TEST] Documents remain fully offline-editable

### F-46. AI-Assisted Features (future, optional)
- [ ] Pluggable AI provider interface: local models preferred for offline; user-provided endpoint + API key stored locally as alternative (IndexedDB only, F-40 rule)
- [ ] AI never required for core CRUD; every AI feature degrades gracefully offline
- [ ] Planned capabilities: natural-language → schema generation, field suggestions, record auto-fill, data cleaning hints
- [ ] [TEST] With AI unavailable/offline: core app fully functional, AI features show disabled state
- [ ] [TEST] User key/endpoint stored only in IndexedDB; never sent anywhere else

### F-47. Extension Framework (future)
- [ ] Plugin registry: custom field types, custom views, custom commands registered by extensions
- [ ] Sandboxed extension loading; extensions ship as local bundles (no remote code execution)
- [ ] [TEST] Registering a custom field type works end-to-end (form input + table cell + validation)
- [ ] [TEST] A broken extension cannot crash the app (isolation boundary test)

### F-48. User-Provided Backend Connection (future, opt-in)
- [ ] Optional backend implemented as a remote `StorageAdapter` implementation (the swappable-engine guarantee); app remains fully functional with no backend configured
- [ ] Endpoint/auth stored only in IndexedDB settings (F-16 server group), never elsewhere; backend is **never** a hard network dependency (F-10/F-37)
- [ ] Local is the source of truth; sync uses the F-37 action queue + F-31 conflict policy (last-write-wins, notifying UI)
- [ ] Sync is explicit/opt-in; workspace scoping (F-06) applies on the backend too
- [ ] **`backend.md` requirement**: when backend work starts, create `backend.md` documenting all features and every endpoint (methods, paths, request/response JSON shapes, auth) mapped against the `StorageAdapter` contract; update it with every backend change
- [ ] [TEST] Backend unavailable/offline → core CRUD fully functional, sync settings shown disabled
- [ ] [TEST] Sync toggle persists; credentials live only in IndexedDB and never leave the device
- [ ] [TEST] Conflict resolution matches the F-31 policy; restart/reload mid-sync is safe

## Testing Strategy: Edge-Case Sweep
A standing, cross-cutting test mechanism that runs at **every phase boundary** to catch edge cases earlier steps missed.

- **Level 1 — Living canon** (`docs/edge-cases.md`): a categorized, accumulating table `[id | scenario | expected behavior | features | test ref]`. Seeded from the backlog + audit; every phase appends new cases **with a test**. Nothing is removed once a test covers it.
- **Level 2 — Cross-feature integration journeys** (Playwright): full user journeys spanning multiple phases — create workspace → schema → records → relationships (F-14) → export → restore (F-28/F-30) → offline edit (F-10) → reconnect → sync-opt-in (F-48). Run at every phase exit + in CI (F-11).
- **Level 3 — Fuzz & chaos**: `fast-check` property scenarios across schemas → records → views; chaos hooks for forced IndexedDB failures, rapid online/offline flapping, 10k-row datasets, deep nesting, unicode/BiDi content.
- **Level 4 — CI-wide invariant tests**: cross-cutting rules a later feature must never break, run on every push: no record without a schema; no orphaned/duplicate ids; no broken references (F-14); no horizontal scroll at 320px; all interactive elements ≥ 44px; no physical CSS props (static scan); import/export round-trip losslessness.
- **Level 5 — Regression-on-bug rule**: every bug found anywhere becomes a canon entry + permanent regression test at fix time.
- **Phase-exit gate**: before starting a new phase, the sweep runs against the current build; the phase is not closed while canon entries lack test refs or invariants fail.

## Explicit Non-Goals (Avoid Wasted Effort)
- No built-in/managed backend, no hosted sync service, no REST/GraphQL API we maintain. An **optional user-provided backend connection is a future extension (F-48)** and must never become a hard dependency or required sync path.
- No push notifications (requires a server)
- No third-party analytics or telemetry (breaks offline-only promise)
- No remote-code plugin loading (extensions must be local bundles)

## Reference Documents
- `AGENTS.md` — tech stack, core rules, workflow commands
- `changelog.md` — per-session log (update every session)
- `package.json` — scripts and dependencies (source of truth for commands)
- `docs/edge-cases.md` — Edge-Case Canon (tested at every phase exit)
- `backend.md` — created when backend work starts (F-48); documents features + every endpoint

## Next Session Checklist
- [ ] Read `changelog.md` for what the last session completed
- [ ] Pick the highest unchecked item in this file (works top-down by phase; F-IDs are ordered by dependency). **Phase 1.5 (F-07a/F-07b/F-12/F-12a) is the immediate priority** — it sits right after F-07, before F-08.
- [ ] Implement feature **and** its paired `[TEST]` items
- [ ] Run the **Edge-Case Sweep** (see Testing Strategy) at phase boundaries; add any new edge cases to `docs/edge-cases.md` with tests
- [ ] Run `lint -> typecheck -> test`
- [ ] Update `changelog.md` with session date, items completed (by F-ID), decisions, blockers
- [ ] **Commit automatically** once checks pass (per feature and when session goals are reached) — do not wait to be asked