# Schema Studio - Handover Document

## Application Overview
**Frontend-only PWA** (no backend, no server API). All data lives in the browser (IndexedDB). Manages JSON Schemas and schema-validated records with full CRUD, installable like a native app, works 100% offline, mobile-first with touch support, full keyboard + command palette, user settings, bring-your-own-data import/export, dark/light themes (+ future custom themes), and complete RTL support including the rich text editor. Core architecture is schema-driven and extensible so the app can grow into larger product modes (see Future Extensions) without rewrites.

Stack: React + TypeScript, Vite, Tailwind CSS v4, Zod, TanStack Query + TanStack Table, Shadcn UI, Motion, React-hook-form, BlockNote, Vitest (+ Playwright for PWA/offline/keyboard e2e).

> Every feature below has matching `[TEST]` items. Do not mark a feature done until its tests exist and pass.

## Naming & Architecture Guardrails
- **Repo rule**: never name commercial products in repo files. Describe future directions by category only: "document-centric workspace", "relational grid", "project tracker", "content hub".
- Core stays **schema-driven**: every view (table, board, document, gallery) is a renderer over the same schema + records model.
- Storage engine must stay swappable behind one interface (IndexedDB today).
- Every future mode must remain fully offline-capable; nothing may introduce a hard network dependency.

## Critical Features (Must-Have)

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

### F-05. Schema Editor — Tabbed (Builder default + Raw JSON) — TOP PRIORITY
- [x] Tabbed editor shell in the create/edit schema dialog: **Builder** (user-friendly, default) and **Raw JSON**
- [x] **Builder tab is the default** on first open; last-used tab persisted in settings (F-21) so power users can pin Raw as their default
- [x] **Raw JSON tab**: the existing F-03 editor (monospace textarea today; a BlockNote-rich raw editing layer can be added later) keeps working unchanged — syntax check, draft `$schema` sync, structural validation errors inline
- [x] Both tabs are two views over the same form state: edits in Builder appear in Raw JSON instantly and vice versa (single source of truth, no "apply" step between tabs)
- [x] Switching tabs never loses content; invalid JSON in the Raw tab blocks saving and shows a parse error with line/column, and cannot corrupt the Builder state
- [ ] Tab control is keyboard-complete (arrow keys, Home/End, `role="tablist"`/`aria-selected`), RTL-aware, reachable via a command-palette action + shortcut (F-17) — keyboard + `Ctrl/Cmd+Alt+1|2` shortcut done; command-palette registration deferred to F-17 (no palette yet)
- [x] Schema diff/preview before save
- [x] [TEST] Toggle Builder ↔ Raw preserves content in both directions (property-based: arbitrary schema JSON round-trips)
- [x] [TEST] Invalid JSON in Raw tab is caught, reported with position, save blocked, Builder state intact
- [x] [TEST] Default tab = Builder for new users; persisted tab preference is honored on reopen
- [x] [TEST] Raw tab regression: F-03 create/edit/delete flow still passes with the tabbed shell in place

### F-06. Visual Schema Builder (User-Friendly Schema Creator) — TOP PRIORITY
- [ ] No-code field editor as the **default** authoring experience: add/remove/reorder/duplicate fields, name + title + description, "required" toggle per field
- [ ] Field type picker covering the core JSON Schema types: `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`, plus `enum`/`const` value sets
- [ ] Type-aware constraint inputs: strings (`minLength`/`maxLength`/`pattern`/`format`), numbers (`minimum`/`maximum`/exclusive bounds/`multipleOf`), arrays (`items` type + `minItems`/`maxItems`/`uniqueItems`)
- [ ] Nested structures: object fields expand inline (one level at a time, breadcrumb/stack navigation for depth), array-of-object item editing, `additionalProperties` toggle
- [ ] Field-level `default` and `description` (rendered as help text) written into the generated JSON Schema
- [ ] **Live generated JSON Schema preview** that updates as the user edits (read-only mirror; the Raw tab is the editable copy)
- [ ] Loads any existing schema back into the builder: constructs the builder understands are editable; constructs it doesn't (`$ref`, `if`/`then`/`else`, `patternProperties`, combinators, etc.) are preserved untouched and surfaced as an "advanced — edit in Raw JSON" badge rather than dropped or silently mangled
- [ ] Round-trip guarantee: Builder output is valid per F-03 structural validation and compiles through F-04 `jsonSchemaToZod()`
- [ ] Fully keyboard-navigable (field rows, keyboard reorder, add-field shortcut), 44px touch targets (F-14), RTL-safe with logical properties only (F-25)
- [ ] Seeded by F-29 schema inference: inferred schema opens pre-filled in the builder for review before save
- [ ] [TEST] Builder produces structurally valid JSON Schema for every supported type/constraint combination (table-driven)
- [ ] [TEST] Round-trip: existing schema → builder → JSON → builder → JSON is lossless for supported constructs
- [ ] [TEST] Unsupported constructs survive an edit session byte-identical and are flagged as advanced
- [ ] [TEST] Keyboard-only + touch-target audit of the builder (parity with F-16 / F-14)

### F-07. GitHub Actions CI (all kinds of testing) — TOP PRIORITY, gates every merge
- [ ] `.github/workflows/ci.yml` triggered on `push` to `main` + all `pull_request`s, with concurrency cancellation of superseded runs
- [ ] **Lint job**: `npm run lint` (Oxlint)
- [ ] **Typecheck job**: `npm run typecheck` (`tsc -b`)
- [ ] **Unit/integration job**: `npm run test` (Vitest + RTL + fake-indexeddb)
- [ ] **Coverage job**: `npm run test:coverage`, failing when Vitest coverage thresholds are not met; report uploaded as an artifact
- [ ] **Production build job**: `npm run build` (`tsc -b && vite build`), `dist/` uploaded as an artifact for downstream jobs
- [ ] **E2E job**: Playwright against the built app (preview server) — desktop Chromium + mobile (Pixel 5) projects, `npx playwright install --with-deps`, CI retries, HTML report + traces uploaded on failure
- [ ] **PWA/offline e2e job**: the F-09–F-11 Playwright suites (installability, offline shell, offline CRUD) against the service-worker build
- [ ] **Lighthouse / PWA audit job** (F-09): budget-checked audit of the built app, report artifact
- [ ] **Accessibility job**: axe checks (Vitest unit-level + Playwright `@axe-core/playwright` e2e) as their own step so failures are obvious
- [ ] **Bundle-size check**: fail on unexpected growth of built assets (keeps the offline PWA lean)
- [ ] Shared setup: Node LTS pinned, `actions/setup-node` with npm cache, one `npm ci` reused across jobs via cache/artifact
- [ ] Required status checks documented for branch protection on `main` (lint, typecheck, unit, coverage, build, e2e)
- [ ] Workflow lint (`actionlint`) + README status badge
- [ ] [TEST] Green run on `main` covering every job above; a deliberately broken PR turns the run red
- [ ] [TEST] Failing e2e uploads report/trace artifacts; a coverage drop blocks merge

### F-08. Record CRUD Against a Schema
- [ ] Dynamic form generation from a selected schema (react-hook-form + generated Zod schema)
- [ ] Real-time field validation + error display
- [ ] Create/read/update/delete records stored per-schema in IndexedDB
- [ ] [TEST] Unit tests: valid record saves, invalid record is rejected with correct field errors
- [ ] [TEST] Integration test: full record lifecycle for a sample schema

## PWA & Offline (Must-Have)

### F-09. PWA Manifest & Installability
- [ ] `manifest.webmanifest`: name, short_name, description, icons (192/512 + maskable), `display: standalone`, theme_color, background_color, shortcuts, scope, start_url
- [ ] Splash screen via background_color + icon; `viewport-fit=cover` for notched devices
- [ ] Install prompt handling (beforeinstallprompt) + in-app "Install" affordance
- [ ] [TEST] Lighthouse PWA audit: installable, manifest valid, icons correct
- [ ] [TEST] Install flow test: prompt captured, deferred, triggered from button

### F-10. Service Worker & App Shell
- [ ] Service worker via `vite-plugin-pwa`/Workbox: precache app shell, runtime caching (stale-while-revalidate) for BlockNote assets/fonts
- [ ] Offline fallback page/state; cache versioning + skipWaiting/clientsClaim update flow with "new version available" UI
- [ ] [TEST] Playwright offline emulation: app shell loads with network disabled
- [ ] [TEST] SW update test: new build → update prompt → reload applies

### F-11. Offline-First Data Operations
- [ ] Every CRUD operation works with zero connectivity (IndexedDB is the source of truth)
- [ ] No network-dependent code paths anywhere in the app (explicit decision: no push notifications, no analytics pings — they require a server)
- [ ] [TEST] Playwright offline: full schema + record CRUD while offline
- [ ] [TEST] Data created offline survives reload and remains valid online later

### F-12. Offline UX
- [ ] Persistent online/offline indicator (navigator.onLine + online/offline events)
- [ ] Action queue: mutations attempted offline are queued and auto-applied/reconciled on reconnect (future-proof for sync)
- [ ] Toasts for offline/online transitions
- [ ] [TEST] Toggle offline → indicator shows; queued action applies on reconnect
- [ ] [TEST] Rapid online/offline flapping doesn't corrupt state

## Mobile-First & Touch (Must-Have)

### F-13. Mobile-First Responsive Design
- [ ] Design at 320px first, then scale up (breakpoints: 320/375/768/1024/1440)
- [ ] No horizontal scroll at 320px; tables degrade to card/list layouts on small screens
- [ ] Safe-area insets (notch/home indicator) via `env(safe-area-inset-*)`
- [ ] [TEST] Layout snapshot tests at all 5 breakpoints
- [ ] [TEST] 320px viewport: zero horizontal overflow, all controls reachable

### F-14. Touch Support & Gestures
- [ ] All touch targets ≥ 44×44px; no hover-only interactions (hover as progressive enhancement)
- [ ] Swipe-to-dismiss on list rows, long-press context menus, pull-to-refresh on lists, drag-to-reorder with touch
- [ ] Haptic feedback via `navigator.vibrate` on destructive actions (where supported)
- [ ] [TEST] Touch-target size audit test (all interactive elements ≥ 44px)
- [ ] [TEST] Gesture tests: swipe dismiss, long-press menu, pull-to-refresh (Playwright touch simulation)

### F-15. Mobile App Navigation
- [ ] Bottom tab bar on mobile (Schemas / Records / Settings), sidebar on desktop — same routes
- [ ] App-shell layout: fixed header, no browser-chrome feel, overscroll behavior controlled
- [ ] [TEST] Mobile nav renders tabs; desktop renders sidebar; same routes resolve
- [ ] [TEST] Keyboard + screen-reader parity between mobile/desktop nav

## Keyboard & Command Palette (Must-Have)

### F-16. Full Keyboard Support
- [ ] Complete keyboard navigation for every view: no mouse-only workflows
- [ ] Global shortcut registry (configurable bindings) with conflict detection
- [ ] Standard patterns: `?` shortcut help overlay, arrow-key table navigation, Enter/Escape in dialogs, focus traps in modals, visible focus rings
- [ ] Record editing fully keyboard-driven (field-to-field flow, save/cancel)
- [ ] [TEST] Keyboard-only e2e: create → edit → delete a record without touching the mouse
- [ ] [TEST] Shortcut registry test: rebind a key, conflict is rejected, help overlay lists all actions

### F-17. Command Palette
- [ ] `⌘K` / `Ctrl+K` palette: fuzzy search over actions, schemas, records, settings, recent items
- [ ] Palette actions executable entirely by keyboard; recent/fuzzy ranking
- [ ] Extensible command registry so future modes register their own commands
- [ ] [TEST] Fuzzy-match test: partial query finds target action/schema/record
- [ ] [TEST] Palette works with keyboard only; Escape closes and restores focus correctly

## Core Features

### F-18. Schema List & Search (TanStack Query + Table)
- [ ] Server-state cache of schemas via TanStack Query (IndexedDB as the "server")
- [ ] Table with sorting, filtering, pagination, search
- [ ] [TEST] Query cache tests: invalidation after create/update/delete
- [ ] [TEST] Table tests: sort/filter/search produce correct rows

### F-19. Record Browser (TanStack Table)
- [ ] Table of records for the selected schema, column inference from schema properties
- [ ] Sorting/filtering/pagination on records
- [ ] [TEST] Table renders records per schema; filters isolate correctly
- [ ] [TEST] Performance test with 1k+ records

### F-20. Basic Import / Export
- [ ] Import schemas/records from `.json` files (file picker, no server)
- [ ] Export single or all schemas/records as `.json` downloads
- [ ] [TEST] Import valid file → items created; invalid file → clear error
- [ ] [TEST] Export produces JSON that round-trips back through import

## User Settings & Configuration

### F-21. App Settings
- [ ] Settings screen with sections: appearance, editor, shortcuts, data, accessibility, language/direction
- [ ] All settings persisted in IndexedDB; reset-to-defaults per section and globally
- [ ] Settings export/import (so users can move setups between browsers/devices)
- [ ] [TEST] Change each setting → persists across reload
- [ ] [TEST] Reset restores defaults; settings export → import round-trips

### F-22. Workspace & Schema Defaults
- [ ] Per-schema defaults (default view, default sort, form layout preferences)
- [ ] User-level defaults applied to new schemas
- [ ] [TEST] New schema inherits user defaults; per-schema overrides win
- [ ] [TEST] Changing a default doesn't mutate existing schemas unexpectedly

## Themes & Internationalization

### F-23. Theme System (Dark / Light / System)
- [ ] Light, dark, and system (follows `prefers-color-scheme`) modes; toggle in header/settings
- [ ] All colors via Tailwind v4 `@theme` CSS variables — no hardcoded hex in components
- [ ] Choice persisted in IndexedDB; editor (BlockNote) theme follows app theme
- [ ] [TEST] Toggle cycles light ↔ dark; system mode tracks OS change live
- [ ] [TEST] Theme persists across reload; BlockNote editor colors match mode

### F-24. Custom Theme Framework (Future-Proofing)
- [ ] Theme registry: themes are swappable CSS variable sets (architecture ready now, themes added later)
- [ ] Planned popular themes (backlog, not built yet): Nord, Dracula, GitHub Dark, Solarized, Monokai
- [ ] Theme picker UI (placeholder once registry exists)
- [ ] [TEST] Registering a new variable set switches the whole app without code changes
- [ ] [TEST] Contrast/accessibility check per theme (WCAG AA) in test suite

### F-25. Full RTL Support (App-Wide)
- [ ] `dir="rtl"` on `<html>` via language/direction setting; entire layout mirrors (sidebar, tables, icons, animations)
- [ ] CSS logical properties only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`) — no physical `ml`/`mr`
- [ ] RTL-aware TanStack Table (column order, scroll direction), mirrored chevron/arrow icons, `Intl` formatting for dates/numbers
- [ ] [TEST] With dir=rtl: layout snapshot matches mirrored design; tables scroll correctly
- [ ] [TEST] Static-analysis test: no physical margin/padding utilities in source

### F-26. RTL in Rich Editor (BlockNote)
- [ ] BlockNote content direction follows app direction; per-paragraph BiDi (Arabic/Hebrew + Latin mixed text)
- [ ] Toolbar alignment, placeholders, and keyboard flow RTL-correct
- [ ] [TEST] RTL document: text alignment, caret movement, mixed BiDi rendering
- [ ] [TEST] Switching LTR ↔ RTL mid-session preserves content and formatting

## Bring Your Own Data (BYOD)

### F-27. Data Import Hub
- [ ] Import from multiple formats: JSON, JSONL, CSV (client-side parsing only)
- [ ] Paste raw JSON/CSV directly into an import wizard with preview before commit
- [ ] Import maps source columns/properties onto an existing or new schema
- [ ] [TEST] Import each format with valid + malformed files; malformed → clear, actionable errors
- [ ] [TEST] Large-file import (10k+ rows) stays responsive (chunked/streaming parse)

### F-28. Data Export & Backup
- [ ] Export schemas/records as JSON, JSONL, CSV; full-workspace backup bundle (schemas + records + settings)
- [ ] Restore from a backup bundle with conflict/diff preview
- [ ] [TEST] Backup → wipe → restore reproduces workspace exactly
- [ ] [TEST] Export → re-import round-trip preserves all field types and metadata

### F-29. Schema Inference from Data
- [ ] Auto-infer a JSON Schema from pasted/sample data (type detection, required fields, enums, patterns)
- [ ] User edits inferred schema before saving
- [ ] [TEST] Inference test on varied samples: nested objects, arrays, mixed types, dates
- [ ] [TEST] Inferred schema validates the source data 100%

## Enhancement Features

### F-30. Data Management
- [ ] Duplicate schema, duplicate record
- [ ] Bulk select + bulk delete/export of records
- [ ] [TEST] Duplicate creates distinct entries with new IDs
- [ ] [TEST] Bulk ops test: N selected → all affected, toast confirms

### F-31. Versioning & History
- [ ] Schema version history (auto-snapshot on save) + restore
- [ ] Record-level audit trail (created/updated timestamps)
- [ ] [TEST] Restore previous version overwrites current correctly
- [ ] [TEST] Timestamps update on edit, not on read

### F-32. Local Sharing (no backend)
- [ ] Share schema/records via exported file or clipboard deep-link (compressed JSON in URL hash)
- [ ] Same-browser tab sync via BroadcastChannel
- [ ] [TEST] URL-hash import reconstructs schema losslessly
- [ ] [TEST] BroadcastChannel: write in tab A appears in tab B

### F-33. App-Like Polish
- [ ] Standalone-mode behaviors: no pull-to-refresh browser chrome conflicts, gesture nav safe zones
- [ ] Motion animations for tab transitions, modals, toasts; skeleton loaders
- [ ] [TEST] Standalone display-mode test (Playwright PWA context)
- [ ] [TEST] Animation reduced-motion respect (`prefers-reduced-motion`)

## Future Extensions (design-for now, build later)

### F-34. AI-Assisted Features (future, optional)
- [ ] Pluggable AI provider interface: local models (e.g., Transformers.js/WebLLM) preferred for offline; user-provided endpoint + API key stored locally as alternative
- [ ] AI never required for core CRUD; every AI feature degrades gracefully offline
- [ ] Planned capabilities: natural-language → schema generation, field suggestions, record auto-fill, data cleaning hints
- [ ] [TEST] With AI unavailable/offline: core app fully functional, AI features show disabled state
- [ ] [TEST] User key/endpoint stored only in IndexedDB; never sent anywhere else

### F-35. Content Hub Mode (document-centric workspace)
- [ ] Pages, blocks, nested documents, links between documents — a wiki-style content layer over the same schema + records model
- [ ] Core enabler: block-based content field type; document renderer as a new view
- [ ] [TEST] Document mode reads/writes through the same storage interface (no new storage path)
- [ ] [TEST] Documents remain fully offline-editable

### F-36. Relational Grid Mode (grid/database workspace)
- [ ] Multiple view types over one schema: grid, board, gallery; linked records between schemas; formulas and rollups
- [ ] Core enabler: relation field type + view-layer decoupling from storage
- [ ] [TEST] Same record set renders correctly in each view type
- [ ] [TEST] Linked-record integrity maintained on delete/rename

### F-37. Project Tracking Mode (workflow/board workspace)
- [ ] Workflows, statuses, assignees, due dates, board/grouped views, iterations
- [ ] Core enabler: workflow field types + status transition rules expressed in schema
- [ ] [TEST] Status transitions validate against schema-defined workflow
- [ ] [TEST] Board view groups/filters without data duplication

### F-38. Extension Framework (future)
- [ ] Plugin registry: custom field types, custom views, custom commands registered by extensions
- [ ] Sandboxed extension loading; extensions ship as local bundles (no remote code execution)
- [ ] [TEST] Registering a custom field type works end-to-end (form input + table cell + validation)
- [ ] [TEST] A broken extension cannot crash the app (isolation boundary test)

## Stability & Quality

### F-39. Resilience
- [ ] Error boundaries, loading/empty states, IndexedDB quota handling
- [ ] [TEST] Force IndexedDB failure → graceful error UI, no data corruption
- [ ] [TEST] Boundary test: a crashing component shows fallback, app stays usable

### F-40. Security & Privacy (client-side)
- [ ] Sanitize imports (no arbitrary code execution from imported JSON)
- [ ] CSP via meta tag; no secrets stored anywhere (nothing to leak)
- [ ] [TEST] Fuzz imported JSON; app never evals/Function() untrusted input
- [ ] [TEST] CSP header/meta present in built index.html

### F-41. Tooling & Standards
- [ ] ESLint + Prettier, pre-commit hook (lint-staged)
- [ ] `npm run build` production build passes; conventional commit messages
- [ ] [TEST] `lint -> typecheck -> test` all green locally **and** in GitHub Actions (F-07)

### F-42. Test Coverage
- [ ] Coverage threshold (Vitest `--coverage`) enforced
- [ ] [TEST] Coverage report meets threshold; no critical path untested

## Explicit Non-Goals (Avoid Wasted Effort)
- No backend, no REST/GraphQL API, no server sync
- No push notifications (requires a server)
- No third-party analytics or telemetry (breaks offline-only promise)
- No remote-code plugin loading (extensions must be local bundles)

## Reference Documents
- `AGENTS.md` — tech stack, core rules, workflow commands
- `changelog.md` — per-session log (update every session)
- `package.json` — scripts and dependencies (source of truth for commands)

## Next Session Checklist
- [ ] Read `changelog.md` for what the last session completed
- [ ] Pick the highest unchecked item in this file
- [ ] Implement feature **and** its paired `[TEST]` items
- [ ] Run `lint -> typecheck -> test`
- [ ] Update `changelog.md` with session date, items completed (by F-ID), decisions, blockers
- [ ] **Commit automatically** once checks pass (per feature and when session goals are reached) — do not wait to be asked
