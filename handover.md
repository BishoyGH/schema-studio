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
- [x] Transaction error handling (`StorageError`) and upgrade/migration path (v1 → v2)
- [x] [TEST] Unit tests with fake-indexeddb for all CRUD functions
- [x] [TEST] Migration test: open old DB version, verify upgrade + timestamp backfill

### F-03. Schema CRUD
- [x] Create/edit/delete JSON schemas (react-hook-form + Zod validation)
- [x] Delete confirmation dialogs
- [x] JSON Schema draft support (2020-12 at minimum) + draft picker
- [x] [TEST] Unit tests for schema form validation (valid + invalid schemas)
- [x] [TEST] Integration test: create schema → persists in IndexedDB after reload

### F-04. JSON-to-Zod Bridge
- [ ] Convert JSON Schema → Zod schema at runtime (e.g. json-schema-to-zod or hand-rolled mapper)
- [ ] Fallback/error path for unsupported schema keywords
- [ ] [TEST] Property-based tests mapping common keywords (type, required, enum, min/max, pattern, nested objects, arrays)
- [ ] [TEST] Tests for unsupported-keyword fallback behavior

### F-05. Record CRUD Against a Schema
- [ ] Dynamic form generation from a selected schema (react-hook-form + generated Zod schema)
- [ ] Real-time field validation + error display
- [ ] Create/read/update/delete records stored per-schema in IndexedDB
- [ ] [TEST] Unit tests: valid record saves, invalid record is rejected with correct field errors
- [ ] [TEST] Integration test: full record lifecycle for a sample schema

## PWA & Offline (Must-Have)

### F-06. PWA Manifest & Installability
- [ ] `manifest.webmanifest`: name, short_name, description, icons (192/512 + maskable), `display: standalone`, theme_color, background_color, shortcuts, scope, start_url
- [ ] Splash screen via background_color + icon; `viewport-fit=cover` for notched devices
- [ ] Install prompt handling (beforeinstallprompt) + in-app "Install" affordance
- [ ] [TEST] Lighthouse PWA audit: installable, manifest valid, icons correct
- [ ] [TEST] Install flow test: prompt captured, deferred, triggered from button

### F-07. Service Worker & App Shell
- [ ] Service worker via `vite-plugin-pwa`/Workbox: precache app shell, runtime caching (stale-while-revalidate) for BlockNote assets/fonts
- [ ] Offline fallback page/state; cache versioning + skipWaiting/clientsClaim update flow with "new version available" UI
- [ ] [TEST] Playwright offline emulation: app shell loads with network disabled
- [ ] [TEST] SW update test: new build → update prompt → reload applies

### F-08. Offline-First Data Operations
- [ ] Every CRUD operation works with zero connectivity (IndexedDB is the source of truth)
- [ ] No network-dependent code paths anywhere in the app (explicit decision: no push notifications, no analytics pings — they require a server)
- [ ] [TEST] Playwright offline: full schema + record CRUD while offline
- [ ] [TEST] Data created offline survives reload and remains valid online later

### F-09. Offline UX
- [ ] Persistent online/offline indicator (navigator.onLine + online/offline events)
- [ ] Action queue: mutations attempted offline are queued and auto-applied/reconciled on reconnect (future-proof for sync)
- [ ] Toasts for offline/online transitions
- [ ] [TEST] Toggle offline → indicator shows; queued action applies on reconnect
- [ ] [TEST] Rapid online/offline flapping doesn't corrupt state

## Mobile-First & Touch (Must-Have)

### F-10. Mobile-First Responsive Design
- [ ] Design at 320px first, then scale up (breakpoints: 320/375/768/1024/1440)
- [ ] No horizontal scroll at 320px; tables degrade to card/list layouts on small screens
- [ ] Safe-area insets (notch/home indicator) via `env(safe-area-inset-*)`
- [ ] [TEST] Layout snapshot tests at all 5 breakpoints
- [ ] [TEST] 320px viewport: zero horizontal overflow, all controls reachable

### F-11. Touch Support & Gestures
- [ ] All touch targets ≥ 44×44px; no hover-only interactions (hover as progressive enhancement)
- [ ] Swipe-to-dismiss on list rows, long-press context menus, pull-to-refresh on lists, drag-to-reorder with touch
- [ ] Haptic feedback via `navigator.vibrate` on destructive actions (where supported)
- [ ] [TEST] Touch-target size audit test (all interactive elements ≥ 44px)
- [ ] [TEST] Gesture tests: swipe dismiss, long-press menu, pull-to-refresh (Playwright touch simulation)

### F-12. Mobile App Navigation
- [ ] Bottom tab bar on mobile (Schemas / Records / Settings), sidebar on desktop — same routes
- [ ] App-shell layout: fixed header, no browser-chrome feel, overscroll behavior controlled
- [ ] [TEST] Mobile nav renders tabs; desktop renders sidebar; same routes resolve
- [ ] [TEST] Keyboard + screen-reader parity between mobile/desktop nav

## Keyboard & Command Palette (Must-Have)

### F-13. Full Keyboard Support
- [ ] Complete keyboard navigation for every view: no mouse-only workflows
- [ ] Global shortcut registry (configurable bindings) with conflict detection
- [ ] Standard patterns: `?` shortcut help overlay, arrow-key table navigation, Enter/Escape in dialogs, focus traps in modals, visible focus rings
- [ ] Record editing fully keyboard-driven (field-to-field flow, save/cancel)
- [ ] [TEST] Keyboard-only e2e: create → edit → delete a record without touching the mouse
- [ ] [TEST] Shortcut registry test: rebind a key, conflict is rejected, help overlay lists all actions

### F-14. Command Palette
- [ ] `⌘K` / `Ctrl+K` palette: fuzzy search over actions, schemas, records, settings, recent items
- [ ] Palette actions executable entirely by keyboard; recent/fuzzy ranking
- [ ] Extensible command registry so future modes register their own commands
- [ ] [TEST] Fuzzy-match test: partial query finds target action/schema/record
- [ ] [TEST] Palette works with keyboard only; Escape closes and restores focus correctly

## Core Features

### F-15. Schema List & Search (TanStack Query + Table)
- [ ] Server-state cache of schemas via TanStack Query (IndexedDB as the "server")
- [ ] Table with sorting, filtering, pagination, search
- [ ] [TEST] Query cache tests: invalidation after create/update/delete
- [ ] [TEST] Table tests: sort/filter/search produce correct rows

### F-16. Record Browser (TanStack Table)
- [ ] Table of records for the selected schema, column inference from schema properties
- [ ] Sorting/filtering/pagination on records
- [ ] [TEST] Table renders records per schema; filters isolate correctly
- [ ] [TEST] Performance test with 1k+ records

### F-17. Schema Editor (BlockNote + JSON view)
- [ ] Rich JSON editing via BlockNote plus raw-JSON toggle with syntax check
- [ ] Schema diff/preview before save
- [ ] [TEST] Toggle between rich and raw view preserves content
- [ ] [TEST] Invalid JSON in raw view is caught and reported

### F-18. Basic Import / Export
- [ ] Import schemas/records from `.json` files (file picker, no server)
- [ ] Export single or all schemas/records as `.json` downloads
- [ ] [TEST] Import valid file → items created; invalid file → clear error
- [ ] [TEST] Export produces JSON that round-trips back through import

## User Settings & Configuration

### F-19. App Settings
- [ ] Settings screen with sections: appearance, editor, shortcuts, data, accessibility, language/direction
- [ ] All settings persisted in IndexedDB; reset-to-defaults per section and globally
- [ ] Settings export/import (so users can move setups between browsers/devices)
- [ ] [TEST] Change each setting → persists across reload
- [ ] [TEST] Reset restores defaults; settings export → import round-trips

### F-20. Workspace & Schema Defaults
- [ ] Per-schema defaults (default view, default sort, form layout preferences)
- [ ] User-level defaults applied to new schemas
- [ ] [TEST] New schema inherits user defaults; per-schema overrides win
- [ ] [TEST] Changing a default doesn't mutate existing schemas unexpectedly

## Themes & Internationalization

### F-21. Theme System (Dark / Light / System)
- [ ] Light, dark, and system (follows `prefers-color-scheme`) modes; toggle in header/settings
- [ ] All colors via Tailwind v4 `@theme` CSS variables — no hardcoded hex in components
- [ ] Choice persisted in IndexedDB; editor (BlockNote) theme follows app theme
- [ ] [TEST] Toggle cycles light ↔ dark; system mode tracks OS change live
- [ ] [TEST] Theme persists across reload; BlockNote editor colors match mode

### F-22. Custom Theme Framework (Future-Proofing)
- [ ] Theme registry: themes are swappable CSS variable sets (architecture ready now, themes added later)
- [ ] Planned popular themes (backlog, not built yet): Nord, Dracula, GitHub Dark, Solarized, Monokai
- [ ] Theme picker UI (placeholder once registry exists)
- [ ] [TEST] Registering a new variable set switches the whole app without code changes
- [ ] [TEST] Contrast/accessibility check per theme (WCAG AA) in test suite

### F-23. Full RTL Support (App-Wide)
- [ ] `dir="rtl"` on `<html>` via language/direction setting; entire layout mirrors (sidebar, tables, icons, animations)
- [ ] CSS logical properties only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`) — no physical `ml`/`mr`
- [ ] RTL-aware TanStack Table (column order, scroll direction), mirrored chevron/arrow icons, `Intl` formatting for dates/numbers
- [ ] [TEST] With dir=rtl: layout snapshot matches mirrored design; tables scroll correctly
- [ ] [TEST] Static-analysis test: no physical margin/padding utilities in source

### F-24. RTL in Rich Editor (BlockNote)
- [ ] BlockNote content direction follows app direction; per-paragraph BiDi (Arabic/Hebrew + Latin mixed text)
- [ ] Toolbar alignment, placeholders, and keyboard flow RTL-correct
- [ ] [TEST] RTL document: text alignment, caret movement, mixed BiDi rendering
- [ ] [TEST] Switching LTR ↔ RTL mid-session preserves content and formatting

## Bring Your Own Data (BYOD)

### F-25. Data Import Hub
- [ ] Import from multiple formats: JSON, JSONL, CSV (client-side parsing only)
- [ ] Paste raw JSON/CSV directly into an import wizard with preview before commit
- [ ] Import maps source columns/properties onto an existing or new schema
- [ ] [TEST] Import each format with valid + malformed files; malformed → clear, actionable errors
- [ ] [TEST] Large-file import (10k+ rows) stays responsive (chunked/streaming parse)

### F-26. Data Export & Backup
- [ ] Export schemas/records as JSON, JSONL, CSV; full-workspace backup bundle (schemas + records + settings)
- [ ] Restore from a backup bundle with conflict/diff preview
- [ ] [TEST] Backup → wipe → restore reproduces workspace exactly
- [ ] [TEST] Export → re-import round-trip preserves all field types and metadata

### F-27. Schema Inference from Data
- [ ] Auto-infer a JSON Schema from pasted/sample data (type detection, required fields, enums, patterns)
- [ ] User edits inferred schema before saving
- [ ] [TEST] Inference test on varied samples: nested objects, arrays, mixed types, dates
- [ ] [TEST] Inferred schema validates the source data 100%

## Enhancement Features

### F-28. Data Management
- [ ] Duplicate schema, duplicate record
- [ ] Bulk select + bulk delete/export of records
- [ ] [TEST] Duplicate creates distinct entries with new IDs
- [ ] [TEST] Bulk ops test: N selected → all affected, toast confirms

### F-29. Versioning & History
- [ ] Schema version history (auto-snapshot on save) + restore
- [ ] Record-level audit trail (created/updated timestamps)
- [ ] [TEST] Restore previous version overwrites current correctly
- [ ] [TEST] Timestamps update on edit, not on read

### F-30. Local Sharing (no backend)
- [ ] Share schema/records via exported file or clipboard deep-link (compressed JSON in URL hash)
- [ ] Same-browser tab sync via BroadcastChannel
- [ ] [TEST] URL-hash import reconstructs schema losslessly
- [ ] [TEST] BroadcastChannel: write in tab A appears in tab B

### F-31. App-Like Polish
- [ ] Standalone-mode behaviors: no pull-to-refresh browser chrome conflicts, gesture nav safe zones
- [ ] Motion animations for tab transitions, modals, toasts; skeleton loaders
- [ ] [TEST] Standalone display-mode test (Playwright PWA context)
- [ ] [TEST] Animation reduced-motion respect (`prefers-reduced-motion`)

## Future Extensions (design-for now, build later)

### F-32. AI-Assisted Features (future, optional)
- [ ] Pluggable AI provider interface: local models (e.g., Transformers.js/WebLLM) preferred for offline; user-provided endpoint + API key stored locally as alternative
- [ ] AI never required for core CRUD; every AI feature degrades gracefully offline
- [ ] Planned capabilities: natural-language → schema generation, field suggestions, record auto-fill, data cleaning hints
- [ ] [TEST] With AI unavailable/offline: core app fully functional, AI features show disabled state
- [ ] [TEST] User key/endpoint stored only in IndexedDB; never sent anywhere else

### F-33. Content Hub Mode (document-centric workspace)
- [ ] Pages, blocks, nested documents, links between documents — a wiki-style content layer over the same schema + records model
- [ ] Core enabler: block-based content field type; document renderer as a new view
- [ ] [TEST] Document mode reads/writes through the same storage interface (no new storage path)
- [ ] [TEST] Documents remain fully offline-editable

### F-34. Relational Grid Mode (grid/database workspace)
- [ ] Multiple view types over one schema: grid, board, gallery; linked records between schemas; formulas and rollups
- [ ] Core enabler: relation field type + view-layer decoupling from storage
- [ ] [TEST] Same record set renders correctly in each view type
- [ ] [TEST] Linked-record integrity maintained on delete/rename

### F-35. Project Tracking Mode (workflow/board workspace)
- [ ] Workflows, statuses, assignees, due dates, board/grouped views, iterations
- [ ] Core enabler: workflow field types + status transition rules expressed in schema
- [ ] [TEST] Status transitions validate against schema-defined workflow
- [ ] [TEST] Board view groups/filters without data duplication

### F-36. Extension Framework (future)
- [ ] Plugin registry: custom field types, custom views, custom commands registered by extensions
- [ ] Sandboxed extension loading; extensions ship as local bundles (no remote code execution)
- [ ] [TEST] Registering a custom field type works end-to-end (form input + table cell + validation)
- [ ] [TEST] A broken extension cannot crash the app (isolation boundary test)

## Stability & Quality

### F-37. Resilience
- [ ] Error boundaries, loading/empty states, IndexedDB quota handling
- [ ] [TEST] Force IndexedDB failure → graceful error UI, no data corruption
- [ ] [TEST] Boundary test: a crashing component shows fallback, app stays usable

### F-38. Security & Privacy (client-side)
- [ ] Sanitize imports (no arbitrary code execution from imported JSON)
- [ ] CSP via meta tag; no secrets stored anywhere (nothing to leak)
- [ ] [TEST] Fuzz imported JSON; app never evals/Function() untrusted input
- [ ] [TEST] CSP header/meta present in built index.html

### F-39. Tooling & Standards
- [ ] ESLint + Prettier, pre-commit hook (lint-staged)
- [ ] `npm run build` production build passes; conventional commit messages
- [ ] [TEST] `lint -> typecheck -> test` all green in CI

### F-40. Test Coverage
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
