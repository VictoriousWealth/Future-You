# Slice 6 — Clean-state evidence report

Status: complete implementation evidence; awaiting product approval  
Verification date: 2026-08-24  
Slice 7: not started

## Outcome

Slice 6 passes its clean-state completion gate. The authenticated product now has one shared mobile shell with real Home, Goals, Ask and Benefits destinations. Home is decision-first, Goals distinguishes the current path from immutable stored what-if results, and Benefits distinguishes active facts from unknown opportunities. Browser modules remain renderers of server-produced DTOs.

No simulator rule, Sarah value, exact-money representation, RLS policy, ownership rule, immutable record, Slice 1–5 expectation or expected financial output was changed to obtain this result.

The authorised live OpenAI gate remains:

> BLOCKED — authorised credential/model configuration unavailable

## Clean local reset proof

Before every clean database gate, the target was verified as local:

- repository Supabase project ID: `future-you`;
- API URL in `.env.local`, `.env.test.local` and `.env.example`: `http://127.0.0.1:54321`;
- local PostgreSQL port: `54322`;
- reset script: `supabase db reset --local`;
- no linked project-reference file was present under `supabase/.temp`;
- no hosted URL, shared project reference or hosted administrative credential was used.

`npm run db:reset` regenerated `supabase/seed.sql`, recreated the local database, applied these committed migrations in order and seeded without a manual step:

1. `20260824140000_slice_3_authenticated_persistence.sql`
2. `20260824170000_slice_4_manual_onboarding.sql`
3. `20260824210000_slice_5_conversations.sql`

The recreated Auth fixtures were confirmed directly in local PostgreSQL:

- `sarah@example.test`
- `alex@example.test`
- `onboarding@example.test`

The seed/artifact check confirmed that the generated database types and committed seed were current. Stateful pgTAP, integration and browser gates each began from a repeatable committed reset because onboarding/version tests create intentionally immutable rows. No row was manually inserted, updated or deleted between gates, and no dashboard action was required.

## Implementation and contract

Slice 6 added no migration and no new persistence table. It reads the immutable contexts, stored runs and separate workplace association already established by earlier slices.

The implementation consists of:

- explicit Home, Goals, Goals-preview and Benefits DTO contracts;
- one product-surface application boundary;
- a Supabase workplace-association source;
- authenticated server composition and route helpers;
- private/no-store Home, Goals, Goals-preview and Benefits APIs;
- a shared header, product shell, fixed four-destination navigation and surface states;
- complete `/home`, `/goals` and `/benefits` surfaces;
- the existing `/ask` experience moved into the same shell;
- root/login routing to Home for users with an active context;
- unit, API-contract, rendering-authority, dependency-boundary and mobile browser coverage;
- nine `414 × 896` visual evidence captures.

Canonical decisions are recorded in `shared-product-surfaces-slice-6.md`. In particular:

- Home may preview only an authoritative opportunity record.
- Goal balances remain confirmed context values; completion dates come from the deterministic baseline or immutable stored run.
- Historical previews remain paired with their original context and baseline.
- Sarah's only authoritative pension fact is 3% employee plus 3% employer; take-home already reflects her contribution and employer contributions are not spendable cash.
- A workplace association does not prove a 5% match ceiling, season-ticket loan, availability or eligibility.
- Benefits calls neither the simulator nor a conversation/model provider.

## Behavioural proof

- Root routing sends unauthenticated users to Login, no-context users to Onboarding and ready users to Home.
- Home renders Sarah's server-produced £900 current/preferred buffer and current-path goals, then opens Ask with supported prefilled prompts.
- Goals renders the current confirmed £3,300/£4,500 emergency-fund balance and December 2026 baseline date.
- A stored £650 result renders the frozen February 2027 emergency-fund date and two-month delay without recalculation or commitment.
- An actual stored result remains attached to its original financial plan after a later context revision and receives an earlier-plan warning.
- Foreign and nonexistent run IDs return the same owner-scoped `RUN_NOT_FOUND` response.
- Benefits renders Sarah's active 3%/3% pension fact, explicitly says the employer amount is not spendable cash, and does not invent a 5% match or season-ticket loan.
- No-workplace and no-verified-opportunity states are honest empty states.
- Sentinel values prove the browser displays server-returned money, dates, delays, statuses and ratios verbatim.

## Provider and calculation boundary proof

The focused product-surface authority run passed 20/20 tests across four files. Static composition checks prove that Home, Goals and Benefits have no conversation/OpenAI provider import or resolver. Browser modules cannot import simulator, persistence, fixture or mapper code. Benefits has no simulator dependency and its application test records zero simulator calls.

Accordingly:

| Surface | Conversation/OpenAI calls | Financial authority |
|---|---:|---|
| Home | 0 | Server application and deterministic baseline |
| Goals | 0 | Server application, deterministic baseline or stored immutable run |
| Benefits | 0 | Persisted context/workplace facts only; no simulator |

No live or fake model provider was called to render these surfaces.

## Security evidence

- Every surface route is authenticated, same-origin protected where applicable, private and `no-store`.
- Owner and context identity are server-resolved; neither is trusted from the browser.
- Goals-preview runs are resolved under the authenticated user's RLS client.
- Foreign and nonexistent resources remain non-enumerable.
- Existing forced RLS, narrow grants, immutable rows and idempotency rules were unchanged.
- Administrative credentials are absent from ordinary read and browser paths.
- Full financial contexts, result payloads and provider bodies are not logged.

## Exact verification results

All discovered tests passed and none were skipped.

| Gate | Discovered | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---:|---|
| Vitest unit/regression | 26 files / 230 tests | 230 | 0 | 0 | PASS |
| Supabase integration | 3 files / 10 tests | 10 | 0 | 0 | PASS |
| PostgreSQL/pgTAP | 3 files / 123 tests | 123 | 0 | 0 | PASS |
| Conversation evaluation corpus | 1 file / 34 tests | 34 | 0 | 0 | PASS |
| Fake-provider modes | 1 file / 8 tests | 8 | 0 | 0 | PASS |
| Focused product-surface authority | 4 files / 20 tests | 20 | 0 | 0 | PASS |
| Playwright mobile Chromium | 15 tests | 15 | 0 | 0 | PASS |
| Required Slice 6 visual captures | 9 captures | 9 | 0 | 0 | PASS |

The evaluation, fake-provider and focused product-surface runs are named subsets of the 230-test Vitest regression and are reported separately because they are explicit completion gates.

Additional gates:

- TypeScript: PASS, zero errors.
- ESLint: PASS, zero errors.
- Production Next.js build: PASS; all application and API routes compiled.
- Client-bundle/dependency boundary: PASS; no server-only simulator/store identifiers in client chunks.
- Generated database seed/type drift: PASS.
- Clean local database resets: PASS; all three migrations and canonical seed applied on every reset.
- Coverage run: 26/26 files and 230/230 tests; 77.41% statements, 62.28% branches, 82.53% functions and 79.88% lines.
- `git diff --check`: PASS.
- Live OpenAI evaluation: BLOCKED — authorised credential/model configuration unavailable.

## Browser and visual evidence

The full 15-test browser run covers the preserved Slice 2 renderer boundary, Slice 3 authentication/persistence, Slice 4 onboarding/versioning, Slice 5 conversation journey and Slice 6 product surfaces. The final clean-state run passed in 36.3 seconds with one mobile Chromium worker.

The required captures are under `artifacts/slice-6-visual/`:

- Home: top, lower current-path section and loading.
- Goals: current, £650 preview, historical preview and safe error.
- Benefits: canonical active-fact and no-workplace empty states.

The first full rerun exposed two new E2E-harness defects: a strict locator observed both Next's transient route fallback and the Home loading state, and a `page.evaluate` callback referenced a Node-side helper that was not serialised. The test was strengthened to require one settled loading state, and the complete request payload is now passed into the browser callback. No product calculation, output, security rule or prior test was altered. The corrected Slice 6 file passed 4/4 before the final full 15/15 rerun.

## Remaining risks and recommendation

- No authoritative employer-benefit catalogue exists, so verified opportunity cards remain correctly absent.
- Product-wide desktop/tablet refinement and final accessibility review remain future work.
- Live OpenAI acceptance remains blocked until an authorised credential and model configuration are separately supplied.

Recommendation: approve Slice 6 on this evidence, then define and freeze the Slice 7 contract before implementation. Do not infer benefit availability or add new simulator behaviour as visual polish. Slice 7 has not been started.
