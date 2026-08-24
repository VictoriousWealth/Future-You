# Slice 2 application and browser boundary

Slice 2 proves the approved dependency path:

```text
Browser UI -> versioned JSON DTO -> Route Handler -> application use case -> simulator
```

The deterministic Slice 1 domain remains the only authority for ledger events, balances, safety
severity, goal dates, recovery cycles, classifications and alternatives. Slice 2 adds transport and
rendering boundaries only. It does not add persistence, authentication, Supabase, conversations,
OpenAI, employer-benefit calculations or new scenario types.

## Canonical JSON representations

Domain money remains `Money { currency: "GBP"; minor: bigint }`. API money is mapped explicitly:

```json
{
  "currency": "GBP",
  "minorUnits": "65000",
  "display": "£650.00"
}
```

`minorUnits` is the canonical base-10 integer string. `display` is server presentation data. No
amount is cast to `number`, `BigInt.prototype.toJSON` is untouched, and there is no global JSON
replacer. Negative values keep a leading minus sign and zero is always `"0"`.

Ratios retain their exact rational inputs and include a deterministic server-mapped presentation:

```json
{
  "numerator": "25000",
  "denominator": "90000",
  "basisPoints": 2778,
  "display": "27.78%"
}
```

The domain remains responsible for threshold evaluation. The browser never classifies from
`basisPoints`. Local dates and months remain ISO `YYYY-MM-DD` and `YYYY-MM` strings. Goal horizon
exhaustion is a tagged `NOT_REACHED_WITHIN_HORIZON` result, never a fabricated date.

The shared safe contract is `src/application/dto/contracts.ts`. Explicit request and response
conversion lives in:

- `src/application/mappers/request-to-domain.ts`
- `src/application/mappers/domain-to-dto.ts`
- `src/application/mappers/error-to-dto.ts`

## Calculation and calendar metadata

Every calculated baseline or scenario carries:

- API and response-schema versions;
- calculation/run, baseline, scenario, parent and context identities;
- simulator rules, calendar and application versions;
- detailed, classification and maximum goal horizons;
- structured assumptions and deterministic confidence;
- input and output identities;
- committed calendar coverage and usage;
- fallback usage and the first fallback period.

The committed England-and-Wales fixture covers `2026-01-01` through `2028-12-31`. Sarah's detailed
six-month path uses that fixture. Her long goal projection reaches 2029, so the response truthfully
reports Monday-to-Friday fallback from `2029-01`. Completion dates outside committed coverage carry
`calendarSource: "WEEKDAY_FALLBACK"`; the UI presents them at month precision.

## Runtime request rules

Zod validates strict JSON objects before a use case runs. The one-off purchase boundary accepts:

- a request/idempotency ID and expected context version;
- a non-blank decision label/purpose;
- positive GBP integer minor units as a bounded decimal string;
- a valid payment month and compatible optional exact date;
- the disclosed `assumed_conservative` payment-timing rule;
- current-account funding, one payment and additional-to-routine-spending treatment;
- an empty Slice 2 assumption-confirmation list.

It rejects numeric, fractional, negative, zero, overlong and non-GBP values, invalid dates/months,
unsupported funding/pattern/treatment/timing values, unsupported decision types and unexpected
fields. It never accepts client-supplied user identity, scenario identity, balances, classifications
or goal dates.

Example valid request:

```json
{
  "requestId": "req_sarah_trip_650_slice_2",
  "expectedContextVersionId": "sarah-v1@2026-09-01",
  "change": {
    "type": "one_off_purchase",
    "amount": { "currency": "GBP", "minorUnits": "65000" },
    "purpose": "trip",
    "paymentPeriod": "2026-09",
    "paymentTiming": "assumed_conservative",
    "paymentDate": null,
    "datePrecision": "month",
    "fundingSource": "current_account",
    "paymentPattern": "single",
    "costTreatment": "additional_to_routine_spending"
  },
  "assumptionConfirmations": []
}
```

## Application use cases and replaceable ports

The application layer exposes:

- `GetCurrentFinancialContextUseCase`
- `GetCurrentPathUseCase`
- `GenerateBaselineUseCase`
- `SimulateOneOffPurchaseUseCase`
- `GenerateAmountAlternativesUseCase`
- `SimulateMonthlyTimingAlternativeUseCase`
- `GetScenarioComparisonUseCase`
- `ListScenarioOptionsUseCase`
- `GetSimulationRunUseCase`

They depend on `FinancialContextSource`, `SimulationRunStore`, injected simulation rules, an injected
working-day calendar and explicit calendar metadata. The temporary Sarah adapter is the only module
that imports Sarah's fixture. Route Handlers and use cases do not. The temporary run store retains
JSON DTOs only and returns isolated clones; it is an intentionally process-local proof, not Slice 3
persistence.

Amount candidates come from the Slice 1 candidate generator. £500 and £400 are immutable siblings
derived from the £650 scenario and anchored to the same baseline. The October option is another
sibling that changes only the payment cycle. The five returned options are:

1. Your current path
2. £650 trip
3. £500 option
4. £400 option
5. Go in October

Selection is explicitly view-only and cannot mutate any projection.

## Route Handlers

| Method and route | Contract |
|---|---|
| `GET /api/v1/financial-context/current` | JSON-safe current Sarah context and calendar coverage |
| `GET /api/v1/contexts/:contextVersionId/current-path` | Requested version's current-path projection |
| `POST /api/v1/baselines` | Version-checked baseline projection |
| `POST /api/v1/scenarios/one-off-purchases` | One-off projection, comparison and presentation |
| `POST /api/v1/scenarios/amount-alternatives` | £650/£500/£400 evaluated siblings |
| `POST /api/v1/scenarios/timing-alternative` | Evaluated month-only sibling |
| `POST /api/v1/scenarios/options` | Five-option browser presentation set |
| `GET /api/v1/simulations/:runId` | Process-local JSON run retrieval proof |
| `GET /api/v1/comparisons?runId=...` | Stored deterministic comparison proof |

Handlers validate, call one use case and translate typed results to `Cache-Control: no-store` JSON.
They do not import domain or fixture modules and never call `Response.json` with a domain result.

## Stable error envelope

```json
{
  "apiVersion": "future-you.api/v1",
  "schemaVersion": "error/1.0.0",
  "error": {
    "code": "INVALID_MONEY",
    "message": "Request did not match the one-off purchase contract.",
    "field": "change.amount.minorUnits",
    "details": {
      "issues": [
        {
          "path": "change.amount.minorUnits",
          "message": "Expected positive base-10 integer minor units."
        }
      ],
      "missingFields": []
    },
    "retryable": false,
    "correlationId": "corr-..."
  }
}
```

Supported typed cases cover invalid JSON/request/money, unsupported currency/scenario, missing or
stale context, missing material information, blocking horizon exhaustion, disclosed calendar
fallback, missing run, rejected simulation and internal simulator failure. Unexpected exceptions
produce a sanitised envelope with no stack trace or financial context.

## Browser rendering proof

`/ask` is a deliberately minimal boundary shell. It submits a structured server-provided command,
renders loading/error states and receives the five server-calculated options. The scenario selector
changes a local selected ID only. Every displayed classification, cash/buffer string, bills result,
overdraft result, recovery month, goal date, assumption, confidence value and monthly-path value is
read from a server presentation DTO.

The UI has no access to `minorUnits`, ratio fields, delay counts or simulator modules. It performs no
money or date arithmetic. The sentinel browser test returns intentionally contradictory strings
(`£901`, `£237`, January 2031, March 2032 and a Noticeable classification) alongside unrelated raw
data; Chromium renders those strings unchanged.

## Static enforcement and test evidence

ESLint and `tests/dependency-boundaries.test.ts` enforce:

- domain imports stay within the domain;
- application code imports no concrete adapter, fixture, framework, server or UI;
- UI imports safe DTO contracts but no domain, fixture, server, mapper or use case;
- UI source contains no `bigint`, simulator invocation or raw outcome-field access;
- Route Handlers import no domain/fixture/adapter and never serialize raw results directly.

`tests/dto-mapping.test.ts` independently proves raw domain `bigint`, zero/negative/large money,
ratio rounding, ISO values, typed horizon exhaustion, calendar fallback and the canonical four
hypothetical branches. API tests recursively reject `bigint`, `Date`, `Map`, `Set`, functions and
`undefined` from JSON trees and prove parse/reserialize stability.

Commands:

```sh
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run test:e2e
git diff --check
```

## Deliberately deferred

The context adapter and run store are not durable or multi-user. Authentication, ownership,
Supabase/PostgreSQL, RLS, cross-user tests and historical persistence remain Slice 3. Natural
language, conversations and OpenAI remain later. Benefits are returned only as an explicit excluded
collection; numerical benefit effects are absent. Assumption editing, commitment, instalments,
substitution, save-first, recurring expenses and pension changes remain unsupported.

Do not begin Slice 3 until Slice 2 is approved.
