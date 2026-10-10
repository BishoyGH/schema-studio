# Edge-Case Canon

Living catalog of cross-cutting edge cases that must keep passing at every phase boundary. Each entry is `[id | scenario | expected behavior | features | test ref]`.

**Rules**
- Any edge case discovered during a phase is appended here **with a test** before the phase closes (handover "Testing Strategy: Edge-Case Sweep").
- An entry is never removed once a test covers it; it becomes a permanent regression.
- At phase exit, zero canon entries may lack a `test ref` (checked by the sweep, F-42 metrics).

Categories: **STO** storage · **CON** concurrency · **OFF** offline · **DAT** data validity · **I18N** localization/RTL · **A11Y** accessibility · **UI** layout · **Q** query-state · **PERF** performance · **SW** service worker · **THEME** theming · **SEC** security.

## Canon

| id | scenario | expected behavior | features | test ref |
| --- | --- | --- | --- | --- |
| STO-01 | Delete schema that has records | Records cascade-deleted atomically; no record without a schema ever exists | F-02/F-07 | `indexeddb.test.ts` cascade |
| STO-02 | Create record for a missing schema | `StorageError` `NOT_FOUND`; nothing persisted | F-07 | `indexeddb.test.ts` NOT_FOUND |
| STO-03 | Delete the default workspace | Cannot be deleted (or is re-created); app remains usable with a workspace | F-06 | `indexeddb.test.ts` default-workspace; `workspace-switcher.test.tsx` |
| STO-04 | Delete a workspace containing schemas/records | Cascade inside one transaction; other workspaces untouched | F-06 | `indexeddb.test.ts` cascade; `workspace-switcher.test.tsx` delete |
| STO-05 | Schema/record `_id` uniqueness | Auto-ids are unique, immutable, never reused after delete (incl. across imports) | F-14 | TBD |
| STO-06 | Create a reference to a missing record/schema | Write-path validation rejects it; no dangling reference can be persisted | F-14/F-07 | TBD |
| STO-07 | Delete a referenced record/schema | Blocked with referrer list, or cascades per policy; never leaves broken refs silently | F-14 | TBD |
| STO-08 | Reference across workspaces | Forbidden by default; rejected at write | F-14/F-06 | TBD |
| STO-09 | Settings store key missing | Returns `null` (not `undefined`); TanStack Query v5 accepts it | F-16 | `queries.ts` useSetting |
| STO-10 | Persisted active-workspace id points to a deleted/missing workspace | Falls back to the default workspace and repairs the stored selection | F-06 | `workspaces.test.tsx` stale selection |
| STO-10U | Deep link references an unknown `$workspaceId` | Route `beforeLoad` redirects to the default workspace; the URL never shows the broken id | F-50 | `workspaces.test.tsx` unknown-id deep link |
| DAT-01 | Invalid JSON in the Raw editor tab | Parse error with line/column; save blocked; Builder state intact | F-05 | `schema-form.test.tsx` |
| DAT-02 | Builder ↔ Raw round-trip | Arbitrary schema JSON round-trips through tab switches losslessly (property-based) | F-05 | `schema-form.test.tsx` fast-check |
| DAT-03 | Unsupported construct in Builder | Survives byte-identical; flagged "advanced — edit in Raw JSON", never mangled | F-12 | TBD |
| DAT-04 | Record `data` written not matching schema | Storage boundary rejects it, not only the UI form | F-07 | `storage/validated.test.ts` write-path; `record-manager.test.tsx` boundary reject |
| DAT-05 | Record created with schema `default` present | Defaults applied on create/form-open | F-07/F-04 | `storage/validated.test.ts` defaults; `record-manager.test.tsx` create |
| DAT-11 | Live form field error vs storage rejection | The form surfaces the same field-level errors as the write path; invalid records can never persist | F-07 | `record-manager.test.tsx` live validation + boundary reject |
| DAT-06 | Restore old schema version that invalidates records | Records re-validated; non-conforming ones flagged with revert/migrate choice, never dropped | F-30 | TBD |
| DAT-07 | Import a file with invalid/malformed data | Clear, actionable error; nothing partially persisted | F-26/F-27 | TBD |
| DAT-08 | Import/export round-trip incl. unicode, empty, nested, ids/references | Lossless; all field types and metadata preserved | F-26/F-28 | TBD |
| DAT-09 | Pasted-data validation in form preview | Errors mapped to fields; `unsupported[]` keywords flagged | F-07a/F-04 | `schema-preview.test.tsx` pasted + advanced flags |
| DAT-10 | Invalid schema while preview panel open | Preview disables cleanly with raw parse error; editing never blocked | F-07a | `schema-preview.test.tsx` disable; `schema-form.test.tsx` disable |
| DAT-16 | Auto-filled sample never satisfies the schema | Preview's generated sample must validate for supported constraints; invalid sample must fail | F-07a | `sample-data.test.ts` valid/invalid + fast-check |
| DAT-12 | `object`/`array` field authored in builder | Round-trips builder ↔ raw; type help shown; nesting/item type configurable | F-12/F-05 | TBD |
| DAT-13 | Rich text field content | Block JSON round-trips create → save → reload and export → import losslessly | F-07b | `validated.test.ts` lossless round-trip; `record-manager.test.tsx` create→reload; export/import (F-26/F-28) TBD |
| DAT-17 | Rich text value not a block document | Write path rejects a non-array value; nothing persists | F-07b | `validated.test.ts` non-document reject; `json-to-zod.test.ts` type reject |
| DAT-14 | Conditional validation rule violated | Field errors in the form + F-07a preview, and rejected at the write path | F-12a | TBD |
| DAT-15 | Calculated field / rollup value | Derived value computed (never trusted from imported data); recalculated after a referenced record is edited/deleted | F-14a | TBD |
| CON-01 | Two tabs edit the same record | Last-write-wins deterministically; BroadcastChannel notifies; no corruption | F-31 | TBD |
| CON-02 | Tab A writes while user reloads tab B | Reloaded state is consistent; no dangling partial write visible | F-31 | TBD |
| OFF-01 | Action queued offline applies on reconnect | Queue auto-applies and reconciles; none lost | F-37/F-48 | TBD |
| OFF-02 | Rapid online/offline flapping | No state corruption; indicator settles; queue not duplicated | F-37 | TBD |
| OFF-03 | Offline create → reload | Data survives reload; still valid and exported later | F-10 | TBD |
| I18N-01 | `dir=rtl` active | Whole layout mirrors; tables scroll/column order correct | F-20 | TBD |
| I18N-02 | Physical CSS properties in source | Static-analysis test fails CI (logical props only) | F-20 | TBD |
| I18N-03 | Mixed BiDi text in BlockNote | Per-paragraph direction correct; caret movement sane | F-21/F-07b | TBD |
| I18N-04 | LTR → RTL mid-session | Content and formatting preserved | F-21 | TBD |
| I18N-05 | Locale missing a translation key | Falls back (fallback locale → key); UI never breaks | F-22 | TBD |
| I18N-06 | Long/emoji/unicode field content | Layout never breaks or overflows at any breakpoint | F-20/F-22 | TBD |
| A11Y-01 | Interactive element smaller than 44px | Touch-target audit fails CI | F-33/F-42 | TBD |
| A11Y-02 | Mouse-free workflow | Every view driveable by keyboard incl. dialogs (focus traps, visible rings) | F-23 | TBD |
| A11Y-03 | Screen-reader parity mobile/desktop nav | Same route set reachable and labeled on both | F-34 | TBD |
| UI-01 | 320px viewport | Zero horizontal overflow; tables degrade to cards; all controls reachable | F-32 | TBD |
| UI-02 | Empty workspace/schema/record list | Renders helpful empty state; first-run onboarding guides | F-16/F-06/F-08/F-09 | F-06 covered by `workspaces.test.tsx`; dashboard empty state by `dashboard.test.tsx`; F-16 onboarding TBD |
| UI-03 | Component crashes | Error boundary fallback; app stays usable | F-39 | TBD |
| UI-04 | IndexedDB power/coverage failure | Graceful error UI; no data corruption | F-39 | TBD |
| Q-01 | Create/update/delete schema or record | TanStack Query cache invalidated; lists rebuild correctly | F-08 | TBD |
| Q-02 | Setting change via hook | Query returns updated value; persists across reload | F-16 | `queries.ts` |
| PERF-01 | 1k+ records in table | Responsive sort/filter/pagination | F-09 | TBD |
| PERF-02 | 10k+ rows import/export | Chunked/streaming; UI stays responsive; quota honored | F-27/F-28 | TBD |
| SW-01 | Service worker updates | IndexedDB data survives install/activate/update cycle | F-36 | TBD |
| THEME-01 | Theme toggle + reload | Choice persists; BlockNote follows mode | F-18/F-07b | persistence + `system` live-switch by `theme-toggle.test.tsx`; BlockNote mode TBD |
| THEME-02 | Custom theme registered | Whole app switches via variable set, no code change | F-19 | TBD |
| SEC-01 | Imported JSON contains eval-like payload | Never evaluated/executed; sanitized | F-40 | TBD |
| SEC-02 | Backend/AI credentials | Stored in IndexedDB only; never in logs, URLs, or bundle | F-40/F-48/F-46 | TBD |

## Phase-Exit Checklist

Before closing any phase and starting the next:

- [ ] Cross-feature Playwright journeys pass (Level 2)
- [ ] Fuzz + chaos suite passes (Level 3)
- [ ] CI-wide invariants pass (Level 4)
- [ ] No canon entry lacks a `test ref` (Level 5 / F-42)
- [ ] Any edge case found this phase is appended above **with** a passing test
- [ ] `lint -> typecheck -> test` green