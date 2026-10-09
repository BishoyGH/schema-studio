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
- **Storage**: All persistence must be handled via IndexedDB (behind a single swappable interface).
- **PWA / Offline**: App is installable and must be 100% functional offline; no network-dependent code paths.
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
- Never name commercial products in repo files; describe capabilities by category.
- AI features are opt-in only, never required for core CRUD, and must degrade gracefully offline.

## Non-Goals
- No backend, no REST/GraphQL API, no server sync, no push notifications, no third-party analytics, no remote-code plugin loading (extensions are local bundles).

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
- The repo is tracked with Git (branch `main`). Keep it tracked: commit after each completed feature and at the end of every session — only once `lint`, `typecheck`, and `test` pass.
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Never commit `node_modules`, build output, coverage, or secrets; keep `.gitignore` current.
- Update `README.md` every session so its Status and Features sections reflect current progress for the potential audience.
- Update `changelog.md` and check off the matching items in `handover.md` each session.
