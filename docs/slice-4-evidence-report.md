# Slice 4 evidence report

Date: 24 August 2026

## Implementation

- Added an authenticated mobile onboarding route at `/onboarding` and immutable correction route at
  `/settings/financial-context`.
- Added string-based onboarding DTOs, strict runtime validation, an exact GBP decimal parser, candidate
  context mapper, correction mapper, preview/status/confirmation/correction use cases, and explicit
  JSON-safe preview/version DTOs.
- Extended the deterministic engine so an opening partial cycle starts at the snapshot, spends only the
  declared remaining reserve, crosses into the next funding month when required, and never replays
  pre-snapshot activity. Existing Sarah v1 behavior is unchanged.
- Enforced that the stored monthly goal budget equals the sum of active per-goal caps. Locked transfers
  retain optional estimated evidence, run exactly once, and continue to suppress automatic allocation at
  that funding event.
- Added `context_confirmation_keys` and `workplace_associations`, context compatibility/request-hash
  metadata, forced RLS policies, explicit grants, immutability triggers, and the narrow
  `confirm_financial_context_version` security-invoker transaction.
- Added a third, genuinely no-context local user for onboarding acceptance while retaining Alex as an
  independent isolation user.
- Added the canonical Sarah onboarding fixture, developer/onboarding contract, this evidence report, and
  an appended evolution-history entry. No previous history was rewritten.

## Behavioral and exactness proof

- A no-context user is redirected from `/ask` to `/onboarding`; Sarah is never used as a runtime fallback.
- Manual Sarah values produce £2,750 cash, £1,850 reserve, £900 current/preferred buffer, £2,450 income,
  £600 derived goal capacity and the frozen December 2026 / May 2027 / June 2029 goal forecasts.
- Candidate preview is deterministic and performs zero persistence writes. The browser sentinel renders
  deliberately impossible server money/dates verbatim.
- Confirmation recalculates the candidate, binds to the reviewed canonical hash, and atomically creates
  one immutable context plus its pointer and request key.
- Concurrent exact confirmations create one version and return the same V1 identity. Changed input under
  the same request ID returns `409 IDEMPOTENCY_KEY_REUSED`.
- Sarah onboarding DTOs map exactly to `SARAH_V1_CONTEXT`; persistence rehydrates the same domain snapshot.
- Decimal inputs convert directly to pence beyond `Number.MAX_SAFE_INTEGER`; malformed, signed-disallowed,
  non-GBP, scientific, hexadecimal, symbol and separator forms are rejected without floating arithmetic.
- The existing £650 trip remains £250 minimum safety buffer, February 2027 emergency-fund completion,
  July 2029 house completion and `AFFORDABLE_SIGNIFICANT_TRADE_OFF`.
- A correction creates V2 with V1 as predecessor. V1 is unchanged, its old stored run remains byte-for-byte
  equivalent at the DTO boundary, and a new baseline uses V2.
- Workplace omission is accepted. A supplied workplace stays user-provided/unverified in a separate table
  and produces identical financial summary and goal results.

## Security proof

- No onboarding request accepts an owner/user ID. The principal comes only from server-verified Supabase
  claims and request-scoped cookies.
- The transaction is `SECURITY INVOKER`, pins an empty search path, is execute-granted only to
  `authenticated`, and remains subject to forced RLS. Normal request paths have no service-role secret or
  bypass path.
- PostgreSQL tests prove anon denial, cross-user non-enumerability, foreign-pointer rejection, owned V2
  creation, and V1 update/delete rejection.
- Preview and both confirmations use the same-origin guard. Unauthenticated input is rejected with typed
  401 before financial validation. Authenticated personal responses are private/no-store.
- No form payload is logged or sent to analytics; no unconfirmed draft is persisted in browser or server
  storage.

## Test evidence

| Gate | Result |
| --- | --- |
| Vitest unit/contract/renderer | 19 files, 163 passed, 0 failed, 0 skipped |
| Supabase integration | 2 files, 8 passed, 0 failed, 0 skipped |
| PostgreSQL/pgTAP | 2 files, 87 passed, 0 failed, 0 skipped |
| Playwright mobile Chromium | 9 passed, 0 failed, 0 skipped |
| TypeScript | Passed, 0 errors |
| ESLint | Passed, 0 errors |
| Production Next.js build | Passed; complete app/API route set compiled |
| Generated artifact drift | Passed; seed and database types current |
| Client-bundle boundary | Passed; no server simulator/store identifiers |
| `git diff --check` | Passed |

Coverage after the final unit suite is 76.00% statements, 61.60% branches, 80.90% functions and 77.76%
lines globally. The correctness-critical onboarding application directory is 92.34% statements / 73.33%
branches / 96.61% functions / 93.19% lines. Infrastructure adapters are intentionally not instrumented by
the unit configuration; their transaction, RLS, idempotency, persistence and cross-user branches have
direct integration and pgTAP coverage instead. Browser authority is additionally covered by unit and
Playwright sentinel tests.

All 74 original Slice 1 tests remain within the passing suite, all prior Slice 2/3 contract and browser
tests remain green, and no test is skipped. Slice 5 was not started.
