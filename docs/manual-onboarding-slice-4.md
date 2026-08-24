# Slice 4 — manual financial onboarding and immutable context versioning

Slice 4 lets an authenticated user with no financial context enter real values, review a deterministic
current-path preview, and explicitly confirm one immutable context version. Ordinary runtime paths never
assign Sarah or any other fixture when context is absent.

## Product flow

The protected flow is `/login` → `/onboarding` → server preview → explicit confirmation → `/ask`.
Returning users with a current pointer go directly to `/ask`. `/settings/financial-context` loads the
current immutable version into a correction form; confirming a correction creates V2 and moves the pointer
without changing V1.

The mobile flow covers:

1. Explanation and consent to build a current path.
2. Cleared cash, snapshot date, remaining active-cycle reserve, and optional overdraft limit.
3. Fixed monthly take-home income and payday rule.
4. Full future-cycle routine-spending envelope and the explicit required-obligation declaration.
5. Preferred safety buffer.
6. Goals, per-goal normal contributions, order, overflow, and explicit next-funding transfer declaration.
7. Optional workplace name.
8. Server-generated preview and confirmation.

Back navigation retains the in-memory draft. Drafts are never written to local storage, session storage,
logs, analytics, or preview tables. Refresh can clear an unconfirmed draft; signing out uses a session-local
logout and unmounts the draft.

## Input and modelling contract

All money enters the browser as a string `{ currency: "GBP", amount: string }`. The server parser trims
surrounding whitespace and converts plain decimal pounds directly to integer pence with `BigInt`. It does
not use `Number`, `parseFloat`, multiplication of a floating value, or rounding. Symbols, separators,
scientific/hex notation, non-finite tokens, leading-zero forms, empty values, and more than two decimals
are rejected. Cleared cash may be signed; reserves, buffers, goal balances and contributions are
non-negative; income and goal targets are positive.

The opening position keeps four distinct values:

```text
actual cleared cash
remaining reserve from snapshot to next funding event
full routine spending for later funded cycles
preferred safety-buffer target
```

The server derives `current safety buffer = cleared cash − remaining reserve` without clamping. A negative
or below-target result is a valid pressured baseline and produces a warning, not an invented decision
impact. The opening ledger begins on the snapshot date, spends exactly the declared remaining reserve,
and never replays earlier activity. If the month's payday has passed, the opening projection aligns to the
next month's funding event and can span the month boundary. Full routine spending begins only after that
event. Same-day debits remain ordered before income.

The shipped aggregate-envelope UI requires the user to declare either `none` or an explicit list of
future recurring required obligations contained inside the full future-cycle routine envelope. Any
itemised routine envelope must reconcile exactly to its total, which prevents a required item being
counted twice. The opening partial cycle uses only the stated remaining reserve, so it does not replay or
prorate recurring costs that may already have cleared before the snapshot.

Each active goal has one normal contribution cap. The monthly contribution budget is derived as the exact
sum of active caps and has no editable input. Goal entry/order is the allocation order. Overflow either
names a valid goal or remains cash. The request must explicitly declare committed transfers as `none` or
provide exact goal/amount entries dependent on the next funding event, with confirmed/estimated evidence.
Locked transfers run once and suppress automatic allocation at that event; later cycles resume normal
buffer-first allocation.

Supported payday rules are a fixed day from 1–31 and last working day. The latter uses the existing
versioned England-and-Wales calendar and reports weekday fallback assumptions outside fixture coverage.
Weekly, fortnightly, four-weekly, irregular and multiple incomes remain unsupported.

## Preview and browser authority

`POST /api/v1/financial-context/previews` validates and parses the request, constructs a candidate domain
snapshot, validates its invariants, runs the existing deterministic simulator, and explicitly maps the
result to `financial-context-preview/1.0.0`. It writes no context, pointer, baseline, scenario, run, request
key, or draft.

The preview returns JSON-safe money display/minor-unit strings, current buffer, monthly contribution
capacity, goal forecasts or typed horizon exhaustion, required-payment coverage, baseline-pressure
warnings, assumptions, confidence, and context/rules/calendar versions. The candidate hash is derived from
the canonical parsed context, mode, expected predecessor and optional workplace association.

The browser holds strings, navigates, submits, and renders. It does not calculate buffer, spending totals,
contribution capacity, goal dates, warnings, confidence, payday dates, or financial outcomes. Unit and
Playwright sentinel tests replace server-derived values with deliberately impossible tokens and verify
that those tokens render verbatim. Production client-chunk inspection blocks simulator and persistence
identifiers.

## Confirmation, idempotency, and immutable corrections

Initial confirmation and revision are separate from preview. The client resubmits the draft plus the
reviewed canonical hash. The server reconstructs and reruns the candidate; a different hash returns
`ONBOARDING_PREVIEW_MISMATCH`.

`public.confirm_financial_context_version` is a narrow `SECURITY INVOKER` PostgreSQL function with an empty
`search_path`, schema-qualified references, authenticated-only execute grant, and no owner argument. It
runs under the request JWT and forced RLS. An advisory transaction lock serialises a user's
operation/request ID. In one transaction it:

- checks user-scoped idempotency;
- locks and compares the current pointer;
- inserts the immutable context version with source, origin, predecessor, hash, and compatibility metadata;
- changes the same user's current pointer; and
- inserts the immutable confirmation key.

First use creates V1. An exact retry returns V1 and creates nothing. Reusing the request ID with different
canonical input returns `409 IDEMPOTENCY_KEY_REUSED`. A stale predecessor returns
`409 CONTEXT_VERSION_CONFLICT`. Different users have independent request-ID namespaces. The function is
not security-definer and ordinary request code contains no service-role credential or RLS bypass.

A correction reads the current version, prefills every supported financial fact, creates a candidate V2,
and confirms it through the same transaction with V1 as expected predecessor. V1 cannot be updated or
deleted. Stored V1 runs keep their original DTO, context/rules/calendar identity and are returned without
recalculation; new baselines use V2. This is correction of confirmed facts, not scenario commitment.

## Optional workplace association

`workplace_associations` is a separate user-owned RLS table. It stores only workplace name,
`user_provided`, and `unverified`. Omission never blocks financial onboarding. Its presence changes the
candidate hash but has no numerical field in the financial snapshot and cannot change cash, buffer,
required coverage, goal contributions, goal dates, pension values, eligibility, or benefit value.

## HTTP operations and errors

| Operation | Purpose |
| --- | --- |
| `GET /api/v1/onboarding/status` | `NOT_STARTED` or `COMPLETE` from the current pointer |
| `POST /api/v1/financial-context/previews` | Request-local deterministic preview; zero writes |
| `POST /api/v1/financial-context/versions` | Confirm initial context |
| `GET /api/v1/financial-context/current` | Existing stable current-context summary |
| `GET /api/v1/financial-context/current/revisions` | Prefilled correction draft |
| `POST /api/v1/financial-context/current/revisions` | Confirm immutable successor version |

All responses are `private, no-store, max-age=0`. Mutations require JSON and pass the existing same-origin
guard. Authentication is resolved before financial input validation so anonymous requests receive typed
401 responses. Stable onboarding codes include `ONBOARDING_INPUT_INVALID`,
`ONBOARDING_INFORMATION_INSUFFICIENT`, `ONBOARDING_PREVIEW_MISMATCH`, `CONTEXT_VERSION_CONFLICT`,
`IDEMPOTENCY_KEY_REUSED`, `GOAL_POLICY_INVALID`, `PAYDAY_RULE_UNSUPPORTED`, `MONEY_INPUT_INVALID`,
`CURRENT_CYCLE_RESERVE_INVALID`, and `PERSISTENCE_FAILURE`. SQL, policy names, tokens, claims, payloads and
stack traces are not exposed.

## Local operations

The generated seed contains three local-only users:

- `sarah@example.test`: canonical Sarah fixture and current context;
- `alex@example.test`: no context, reserved for isolation/no-context checks;
- `onboarding@example.test`: no context, reserved for the manual acceptance journey.

Credentials are defined in `scripts/generate-supabase-seed.ts`; they are test-only. A clean verification
sequence is:

```bash
npm run db:reset
npm run db:test
npm test
npm run test:integration
npm run db:reset
npm run test:e2e
npm run typecheck
npm run lint
npm run build
npm run test:coverage
npm run db:artifacts:check
npm run build:boundary:check
git diff --check
```

The second reset restores the no-context browser user after the integration journey. Inspect versions,
pointers, and historical runs in local Studio or with SQL against port 54322:

```sql
select user_id, version_id, predecessor_version_id, origin, payload_hash
from public.financial_context_versions order by user_id, created_at;

select user_id, current_financial_context_version_id
from public.profiles order by user_id;

select user_id, run_id, context_version_id, response_hash
from public.simulation_runs order by user_id, created_at;
```

To verify history, create a run under V1, confirm V2, then compare the stored run's
`context_version_id`/`response_hash` with a new baseline's V2 identity. The integration and Playwright
suites automate this check.

## Known limits and deferred work

This slice deliberately has no LLM, natural-language interpretation, bank/payroll/employer integration,
benefit catalogue or arithmetic, full budgeting system, onboarding draft persistence, multiple incomes,
weekly/irregular pay, scenario commitment, save-first, recurring decisions, pension changes, instalments,
spending substitution, Open Banking, or full production visual polish. The UI uses the approved aggregate
routine envelope; richer item editing can be added later without moving calculations into the browser.
Slice 5 does not begin automatically.
