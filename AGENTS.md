# Agent Instructions

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Motion
- **Forms & Validation**: React-hook-form, Zod
- **Data Fetching & State**: TanStack Query, TanStack Table
- **UI Components**: Shadcn UI, BlockNote
- **Persistence**: IndexedDB (browser-side)
- **PWA**: vite-plugin-pwa / Workbox, manifest.webmanifest, service worker
- **Testing**: Vitest, React Testing Library, Playwright (PWA/offline e2e)

## Core Logic
- **JSON Schema CRUD**: All operations must respect/utilize JSON Schema for validation and structure.
- **Validation**: Use Zod for schema-to-type safety and runtime validation.
- **Workspaces**: Schemas and records are grouped under a container ("workspace"); all storage APIs are workspace-scoped.
- **IDs & Relationships**: Every schema/record has an auto-generated, immutable, unique id; records may reference records in other schemas via a reference field type with referential enforcement (block or cascade, never a silently broken link).
- **Form preview**: Schema authoring must expose a live generated-form + validation preview so authors see what records will look like.
- **Field types**: Support core JSON Schema types plus a rich text / block content field type (BlockNote) via an `x-schema-studio` extension keyword; authoring a rich text field is a first-class, early capability, not an afterthought.
- **Localization**: User-facing strings are localizable; layout uses only logical properties (RTL).
- **Undo/Redo**: Destructive/multi-step workflows (builder, record edits, imports) expose undo/redo.
- **Storage**: All persistence must be handled via IndexedDB (behind a single swappable interface).
- **PWA / Offline**: App is installable and must be 100% functional offline; no **required** network-dependent code paths (an optional user-provided backend is a future extension, never a hard dependency).
- **Mobile-First**: Design at 320px first; touch targets >= 44px; touch gestures (swipe, long-press, pull-to-refresh).
- **Keyboard + Command Palette**: Every workflow must be keyboard-complete; register actions in a central command registry exposed via the command palette.
- **Settings**: User/app/schema defaults persist in IndexedDB; settings are exportable/importable.
- **BYOD**: Import/export JSON/JSONL/CSV and full-workspace backups client-side; infer schemas from sample data.
- **Theming**: Dark/light/system modes via Tailwind v4 CSS variables; theme registry for future custom themes.
- **RTL**: Full app-wide RTL using CSS logical properties only; BlockNote editor must support RTL + BiDi.

## Architecture Guardrails
- Schema-driven core: views (table, board, document, gallery) are renderers over the same schema + records model.
- Keep view layer decoupled from storage; future product modes must reuse the same storage interface.
- Future modes to design for (do not build yet): document-centric workspace, relational grid, project tracker, AI assistance, extension framework.
- Never name commercial products in repo files; describe capabilities by category (e.g., "auto-generated ids + reference fields with referential integrity", not product names).
- AI features are opt-in only, never required for core CRUD, and must degrade gracefully offline.
- **Edge-Case Sweep**: run the `docs/edge-cases.md` canon + cross-feature suites at every phase boundary (see `handover.md` "Testing Strategy"); every bug found becomes a canon entry + regression test.

## Non-Goals
- No built-in/managed backend, no hosted sync service, no REST/GraphQL API we maintain. An optional user-provided backend connection is a future extension (see `handover.md` F-48) and must never become a hard dependency or required sync path.
- No push notifications, no third-party analytics, no remote-code plugin loading (extensions are local bundles).

## Development Workflow
- Commands:
  - `npm run dev` - Start Vite dev server
  - `npm run build` - Production build (`tsc -b && vite build`)
  - `npm run lint` - Oxlint
  - `npm run typecheck` - `tsc -b`
  - `npm run test` - Run Vitest
  - `npm run test:coverage` - Vitest with coverage
  - `npm run test:e2e` - Run Playwright (install browsers once via `npx playwright install`)

## Version Control & Documentation
- The repo is tracked with Git (branch `main`). Keep it tracked.
- **Always commit automatically** — do not wait to be asked. Commit once a feature is finished, and again when session goals are reached, as long as `lint`, `typecheck`, and `test` pass.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Never commit `node_modules`, build output, coverage, or secrets; keep `.gitignore` current.
- Update `README.md` every session so its Status and Features sections reflect current progress for the potential audience.
- Update `changelog.md` and check off the matching items in `handover.md` each session.
- **Backend work**: when backend implementation starts (future extension F-48), create `backend.md` documenting all features and every endpoint (methods, paths, request/response JSON shapes, auth), matched against the `StorageAdapter` contract. Keep it current with every backend change.
