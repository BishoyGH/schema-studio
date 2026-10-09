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
