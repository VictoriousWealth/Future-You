# Slice 1 deterministic simulator

This package implements the framework-independent simulator governed by
[simulation rules §§2–11](./simulation-rules-specification.md) and the Slice 1 boundary in the
[technical architecture specification](./technical-architecture-specification.md). It has no UI,
database, authentication, HTTP, environment-variable, network, or AI dependency.

## Deterministic contract

- Money is non-negative integer minor units at input boundaries; signed `Money` is used only for
  projected balances. `£650` is `gbp(65_000)`.
- Dates are validated `LocalDate`/`YearMonth` strings and never come from the current clock.
- Rules are supplied explicitly. Slice 1 exports `SLICE_1_RULES` (`fy-sim/1.0.0`) with a six-event
  classification window, six detailed periods, and a 120-allocation-event goal horizon.
- An unfinished goal returns `NOT_REACHED_WITHIN_HORIZON`, its last projected period, and the number
  of events evaluated. The engine never invents a completion date.
- Every projection exposes context, rules and calendar versions, horizons, scenario ancestry,
  an input identity, and a separated assumption manifest.
- Baselines, contexts, scenarios and results are deeply immutable from the caller's perspective.

## Working-day calendar

`WorkingDayCalendar` is injected. The Sarah fixture uses
`ENGLAND_WALES_WORKING_DAY_CALENDAR`, a committed snapshot of the GOV.UK England and Wales bank
holiday data with version `govuk-england-and-wales-2026-2028@2026-08-23`. The pure simulator never
performs a live lookup. Dates outside committed coverage use the specification's disclosed
Monday-to-Friday fallback and add an assumption to the projection.

Sarah's month-level 2029 goal result uses that fallback for allocation-event dates; the exact
completion month is unaffected. A future calendar adapter may refresh committed data outside the
domain package.

## Construct and run

Use normal constructors at the boundary, then unwrap or handle the typed `Result`:

```ts
import {
  ENGLAND_WALES_WORKING_DAY_CALENDAR,
  SLICE_1_RULES,
  createFinancialContext,
  createOneOffPurchaseScenario,
  gbp,
  generateBaseline,
  simulateOneOffPurchase
} from "../src/index";

const contextResult = createFinancialContext(contextInput);
if (!contextResult.ok) throw contextResult.error;

const baselineResult = generateBaseline({
  baselineId: "baseline-1",
  context: contextResult.value,
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
});
if (!baselineResult.ok) throw baselineResult.error;

const scenarioResult = createOneOffPurchaseScenario({
  id: "scenario-trip",
  baselineId: "baseline-1",
  amount: gbp(65_000),
  purpose: "friends trip",
  paymentPeriod,
  datePrecision: "MONTH"
});
if (!scenarioResult.ok) throw scenarioResult.error;

const comparison = simulateOneOffPurchase({
  baselineId: "baseline-1",
  baseline: baselineResult.value,
  context: contextResult.value,
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
  scenario: scenarioResult.value
});
```

`comparison.value` contains the unchanged baseline, isolated scenario projection, structured goal
impacts, and deterministic classification. Presentation copy is a separate boundary mapping.

## Sarah v1

All frozen Sarah amounts and expected golden-path values live in
`src/fixtures/sarah-v1.ts`. Run the normal validated path with:

```ts
const baseline = runSarahV1Baseline();
const trip = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline);
```

The £500, £400 and October definitions in `SARAH_V1_SCENARIOS` are independent siblings sharing
the same baseline. None commits a change into current context.

## Tests and traceability

```sh
npm run typecheck
npm test
npm run test:coverage
```

The 19 normative IDs map one-to-one to named tests in `tests/sarah-acceptance.test.ts`:

| Specification | Executable tests |
|---|---|
| Baseline | `SARAH-B-001` through `SARAH-B-005` |
| £650 trip | `SARAH-T-001` through `SARAH-T-014` |

Golden-path alternatives map to `tests/sarah-alternatives.test.ts`:

| Path | Executable tests |
|---|---|
| Candidate generation | `SARAH-A-AMOUNTS-001` |
| £500 | `SARAH-A-500-001` through `SARAH-A-500-003` |
| £400 | `SARAH-A-400-001` through `SARAH-A-400-003` |
| Go in October | `SARAH-A-OCT-001` through `SARAH-A-OCT-004` |
| Cross-branch isolation | `SARAH-A-ISOLATION-001` |

Focused unit and invariant suites cover money/date validation, calendar fallback, event ordering,
required debits before payday, reserve/safety calculations, goal rollover and caps, immutability,
determinism, material unknowns, horizon exhaustion, and unsupported scenarios.

## Deliberately deferred

Slice 1 supports only single, additional, current-account one-off purchases. It does not implement
benefit uptake, scenario commitment, instalments, spending substitution, save-first, pension
changes, recurring scenarios, uncertainty-range sensitivity, persistence, authentication,
conversation, UI, or provider integrations. Later OpenAI calls must remain behind the approved
provider boundary and use `store: false` unless retention is approved. Later Supabase work must use
both grants and RLS, with automated cross-user isolation tests.
