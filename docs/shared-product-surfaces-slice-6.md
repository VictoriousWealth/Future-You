# Slice 6 — Shared product surfaces contract

Status: canonical implementation contract  
Approved: 2026-08-24  
Supersedes: the Home/Goals/Benefits assumptions in the older UI mapping where they conflict with this document

## Purpose and boundary

Slice 6 turns the existing authenticated Ask experience into one coherent mobile product by adding Home, Goals, Benefits and a shared shell. It does not add a financial scenario, recommendation, employer-benefit calculation, AI capability, persistence table or migration.

The browser remains a renderer. All amounts, dates, ratios, status labels, scenario effects and provenance shown on these surfaces are prepared server-side from authenticated, owner-scoped records.

## Pre-implementation data-contract audit

The audit was completed before application code was changed.

| Surface fact | Existing authority | Decision |
|---|---|---|
| Current context/version | `profiles.current_financial_context_version_id` plus immutable `financial_context_versions` | Use the authenticated server-resolved current pointer. The browser never supplies an owner or context version. |
| Current cash and desired buffer | Persisted financial-context values | Display separately. Do not treat overdraft as cash. |
| Goal current balances and targets | Goal opening balances in the selected persisted context | Display as confirmed current balances. A hypothetical preview never rewrites them. |
| Current-path completion dates | Deterministic baseline generated through the existing application operation | Display the returned dates; do not estimate dates in the surface layer. |
| Scenario completion dates/delays | Immutable stored run DTO | Read the run. Do not recalculate it for preview. |
| Historical preview baseline | The stored run's original context version and embedded baseline/comparison | Keep the original baseline and scenario together. Never compare a V1 run to a V2 current path. |
| Active pension fact | `PENSION_INFORMATION` in the persisted financial context | Sarah may show 3% employee and 3% employer contributions, already reflected in net pay and not spendable cash. |
| Workplace | Separate `workplace_associations` row | A user-provided workplace is unverified and numerically inert. |
| Pension match ceiling | No persisted authoritative field | Do not show a 5% ceiling or missed-match claim. |
| Season-ticket loan | No persisted authoritative benefit record | Do not show availability, eligibility or an opportunity card. Workplace name alone is insufficient. |

No blocking data-contract gap was found. The product can honestly render active pension information, an unverified-workplace state, a no-workplace state and a no-known-benefits state. Adding a benefit catalogue, match ceiling or season-ticket fact would require a later approved contract and authoritative source.

## Authority boundaries

```text
Authenticated browser
    ↓ owner-free request
Authenticated read Route Handler
    ↓ request-scoped principal
Product-surface application use case
    ↓ existing persistence ports / simulator operation
Explicit JSON-safe surface DTO
    ↓
Renderer-only product surface
```

Home, Goals and Benefits have no conversation-provider dependency. Benefits has no simulator dependency. Browser modules cannot import the simulator, server orchestration, persistence adapters, fixtures or domain-to-DTO mappers.

## Shared shell and navigation

The authenticated product has one shell and one bottom navigation with four real destinations:

- Home — `/home`
- Goals — `/goals`
- Ask — `/ask`
- Benefits — `/benefits`

The active item uses `aria-current="page"` and the reference blue/pink/purple treatment. The shell provides a consistent brand header, context status, maximum mobile width, safe-area spacing and fixed navigation. Ask retains its history action inside the shared header.

The root flow is deterministic:

- unauthenticated → `/login`;
- authenticated without a current context → `/onboarding`;
- authenticated with a current context → `/home`.

## Home

Home is decision-first. It adapts supplied screens 4 and 5 without inheriting unsupported copy.

The upper section contains:

- a personal greeting;
- the question “What are you thinking about?”;
- supported decisions that open Ask with a prefilled, supported prompt;
- no unsupported prioritisation, Wrapped, pension-change or benefit-simulation prompt.

The lower section contains a compact current-path overview prepared in one server read:

- current safety buffer and preferred level;
- the user's goals, confirmed current balance, target, server-produced progress ratio and current-path completion date;
- an opportunity preview only when an authoritative opportunity record exists.

For Sarah v1 there is no authoritative opportunity record, so Home does not claim a season-ticket loan or missed pension match.

## Goals

Goals has two explicit modes.

### Current path

Shows the current authenticated context, its confirmed goal balances and targets, server-produced progress DTOs, and baseline completion dates.

### Stored hypothetical preview

`runId` selects an immutable, owner-scoped run. The preview shows:

- a clear hypothetical label and scenario label;
- the run's context version and whether it is current;
- each goal's confirmed balance and target from that original context;
- the original baseline date, stored scenario date and stored delay;
- an earlier-plan warning when the context pointer has moved.

Preview is viewing state only. It creates no scenario, makes no calculation, changes no context and never compares a historical run to a newer current baseline. A foreign and a nonexistent run use the same not-found response.

## Benefits

Benefits is informational and numerically inert. It does not call the simulator or a model provider and it does not infer an employer catalogue from a workplace name.

Supported states are:

1. No workplace supplied.
2. User-provided, unverified workplace with no verified catalogue.
3. No known benefit information.
4. Confirmed active informational fact from the selected context.

Sarah's canonical persisted state may show:

- employee pension contribution: 3%;
- employer pension contribution: 3%;
- already reflected in confirmed take-home pay;
- employer contribution is not spendable cash;
- OniBank is user-provided and unverified.

It may not show the unsupported 5% match ceiling, a missed-match amount, a season-ticket loan, eligibility or cash-flow savings.

## Surface DTOs and APIs

The versioned read operations are:

```text
GET /api/v1/home
GET /api/v1/goals
GET /api/v1/goals/preview?runId=...
GET /api/v1/benefits
```

All are authenticated, private/no-store, owner-scoped and return JSON-safe DTOs. Successful DTOs carry API/schema versions and the relevant context/run identity. Money uses exact decimal-string minor units plus a server display string. Progress carries exact numerator/denominator strings, server basis points and server display text. Dates and delay labels are server-produced strings.

## Rendering and failure states

The product surfaces provide neutral loading, empty and retryable error states. No partial financial claim appears during loading. Renderer sentinel tests replace server values with visibly impossible but valid strings and prove that the browser renders those strings verbatim.

All interactive controls are keyboard reachable, have visible focus, meet mobile target sizing, expose semantic labels and do not use colour as the sole state indicator. Reduced-motion preferences are respected.

## Security and privacy

- No browser owner ID or arbitrary context ID is accepted.
- A requested run is resolved by the authenticated user's RLS session.
- Foreign and nonexistent run IDs are non-enumerable.
- Responses are private and `no-store`.
- Home/Goals/Benefits do not send data to OpenAI or the fake conversation provider.
- Full financial contexts and result payloads are not logged.
- Existing forced RLS, grants and immutable records remain unchanged.

## Explicit deferrals

No goal editing, goal creation, benefit catalogue, benefit verification, benefit uptake, benefit calculation, season-ticket-loan modelling, pension change, recommendation, scenario commitment, connected financial data, provider-backed Home content or product-wide final polish is introduced.

## Completion gate

Slice 6 is complete only when the four destinations share one shell, the root routing contract works, Home is decision-first, Goals renders current and immutable historical/scenario views correctly, Benefits reflects only authoritative states, the browser performs no financial calculation, the surfaces call no model provider, cross-user isolation is proven, mobile Chromium journeys and reference-size visual evidence pass, all Slice 1–5 gates remain green, no test is skipped and the evolution history is appended without rewriting prior entries.

## Developer verification

Local product review requires the committed Supabase stack and environment files used by Slices 3–5.

```bash
npm run db:reset
npm test
npm run test:integration
npm run db:test
npm run typecheck
npm run lint
npm run build
npx playwright test tests/e2e/slice-6-product-surfaces.spec.ts
npm run build:boundary:check
npm run db:artifacts:check
git diff --check
```

The Slice 6 browser suite writes its `414 × 896` captures to `artifacts/slice-6-visual/`.

To prove a Goals preview came from the simulator, obtain the `runId` from the immutable Ask result or
`simulation_runs` row, call `GET /api/v1/goals/preview?runId=...` as the owning user, and compare its
run/context identities with `GET /api/v1/simulations/:runId`. The preview mapper reads the stored run's
embedded baseline and comparison; it does not invoke a scenario calculation.

To verify benefit restraint, inspect `financial_context_versions.payload.informationalContext` and the
owner's separate `workplace_associations` row. Then call `GET /api/v1/benefits`. A workplace row may
change the workplace state, but it cannot create an opportunity. The production product-surface
composition imports no conversation provider, and the dependency/bundle gates enforce that boundary.

Known limitation: there is no authoritative benefit-catalogue persistence contract in Slice 6. That is
intentional. Available/eligibility-unknown opportunity cards cannot appear until a later slice defines
their sources, freshness, ownership and user-facing state.
