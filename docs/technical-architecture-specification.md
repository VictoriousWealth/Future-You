# Future You — MVP Technical Architecture Specification

**Version:** 1.0-draft  
**Status:** Proposed for architecture approval; no implementation authorised by this document  
**Product scope:** Approved MVP  
**Canonical fixture:** Sarah v1  
**Architecture style:** TypeScript modular monolith with a deterministic domain core

## 0. Purpose, authority and scope

This document defines the smallest credible technical architecture for the approved Future You MVP. It specifies how to build the product already defined; it does not redefine financial behaviour, Sarah v1, conversation behaviour, UI behaviour or MVP scope.

**Slice 5 scoped amendment:** `conversational-orchestration-slice-5.md` is normative where it narrows the
provider to strict interpretation and symbolic explanation planning, removes Slice 5 benefit branches,
limits clarification to supported inputs, or defines the current visual-delivery sequence. The original
slice labels in section 27 are historical sequencing guidance; approved Slice 1–5 contracts now control
implementation numbering.

**Slice 6 scoped amendment:** `shared-product-surfaces-slice-6.md` is normative for the authenticated
shell, root routing, Home/Goals/Benefits read models, stored-run goal previews and the benefit-data
audit. A workplace name never implies a catalogue, eligibility or an opportunity. The older incomplete
season-ticket-loan UI branch is not part of Slice 6.

The governing product contracts are:

1. `simulation-rules-specification.md` for financial meaning and deterministic calculation rules
2. `golden-path-conversation-specification.md` for conversational behaviour
3. `golden-path-ui-mapping.md` for screen, state and interaction behaviour
4. `mvp-specification.md` for the subset that version one must implement

When a broader contract describes a capability that the MVP specification defers, the MVP scope wins for implementation. This produces three important scope resolutions:

- The simulation and conversation specifications describe how a scenario could later become current context, but MVP section 14.2 explicitly excludes scenario commitment. The architecture supports versioned confirmed context, but exposes no **Commit scenario** operation in MVP.
- The conversation specification describes how a fully quantified benefit branch could later become Simulated, but MVP sections 9 and 15 defer numeric benefit-uptake simulation. The MVP may create and persist a `NeedsInformation` benefit-exploration branch, but it must not evaluate it numerically.
- The UI mapping notes that instalment and spending-substitution controls need further financial rules, while the later MVP specification explicitly makes both unsupported. The MVP assumptions sheet therefore supports only amount, month, one-payment confirmation, current-account funding and additional-to-routine-spending treatment; it labels instalments and substitution unsupported instead of implementing undefined controls.

No other blocking conflict was found. Undefined behaviours that remain open are listed in section 0.1 and must not be filled in by an LLM, UI component or infrastructure adapter.

### 0.1 Open implementation decisions inherited from the product contracts

| ID | Undefined detail | MVP-safe architectural treatment | Resolution needed |
|---|---|---|---|
| U-01 | Maximum extended goal-projection horizon | Make `maxProjectionCycles` an explicit, persisted request/ruleset value. Sarah tests supply a horizon long enough to reach July 2029. Do not hard-code a user-facing limit silently. | Confirm the product-wide cycle limit before real-user release. |
| U-02 | Authoritative UK bank-holiday source | Inject a versioned `WorkingDayCalendar`. Use the specification's disclosed Monday-to-Friday fallback when no approved calendar is configured. Sarah's acceptance values do not claim an exact low-balance day. | Approve a calendar source/version before claiming exact working-day forecasts. |
| U-03 | Exact trip and routine-spending dates | Preserve month-only precision and the specified conservative/spread timing rules. Display “during September,” not an invented date. | No blocker for the golden path. |
| U-04 | Real-user estimate ranges | MVP accepts planning estimates and emits Medium confidence, but does not perform full range sensitivity. | Define range collection before enabling Low-confidence sensitivity. |
| U-05 | Numeric pension and season-ticket terms | Represent as incomplete opportunities only. No numeric tool exists in MVP. | Requires later product and simulator contracts. |
| U-06 | Scenario selection on session resume | The MVP permits either resuming the selection or opening Current path. This architecture recommends opening Current path while retaining every saved option, because it is the least likely to misrepresent a hypothetical as current. | May be changed as a UI preference without changing financial rules. |

## 1. Architecture goals

The architecture must:

1. Make the deterministic engine the sole authority for balances, goal dates, classifications, alternatives and comparisons.
2. Produce identical financial outputs for the same canonical input, calendar, projection policy and rules version.
3. Keep the confirmed baseline immutable within a comparison and keep every what-if isolated.
4. Retain the context version, assumptions, scenario ancestry, rules version and result hash behind every displayed result.
5. Allow the simulator and all Sarah acceptance tests to run without a database, browser, network or LLM.
6. Fail closed when material context, benefit terms or simulator output is missing.
7. Support the complete mobile-responsive golden path with one deployable application.
8. Keep onboarding, workplace association and conversation separate in both data flow and UI state.
9. Optimise for hackathon iteration without creating throwaway financial logic.
10. Provide clear seams for later providers and scenario types without implementing post-MVP systems now.

The architecture deliberately optimises for correctness and explainability over high throughput. There is no current need for microservices, queues, event streaming, a vector database, a data warehouse or distributed caching.

## 2. System context and major components

Future You is a **modular monolith**: one responsive web application and one server application deployed together. Managed authentication/database infrastructure and the LLM API are external dependencies, not separate Future You services.

```text
Responsive browser
       |
       v
Next.js UI + server Route Handlers (one deployable application)
       |
       v
Application use cases / conversation orchestrator
       |                 |                    |
       v                 v                    v
Pure financial      Persistence ports     LLM provider port
domain + simulator       |                    |
                         v                    v
                  Supabase Postgres       OpenAI API
                  + Supabase Auth
```

Dependency direction is inward:

```text
UI / API adapters -> application use cases -> domain
AI adapter -------^                       ^
database adapter -^                       |
domain never imports UI, database, auth or AI code
```

### 2.1 Component responsibilities

| Component | Responsibility | Must not do |
|---|---|---|
| Responsive frontend | Render Home, Ask, Goals, Benefits and onboarding; hold view selection and loading state; submit commands; render deterministic presentation data | Calculate financial results, infer missing amounts or mutate current context by selecting a what-if |
| Backend/API adapter | Authenticate, authorise, validate payloads, apply idempotency, call use cases and map domain results to JSON | Contain financial rules or trust client-supplied ownership/context data |
| Application layer | Coordinate repositories, simulator, scenario lifecycle and conversation workflow; define transaction boundaries | Recalculate domain values with ad hoc arithmetic |
| Financial-context domain | Validate and version current accounts, income, spending, obligations, goals, evidence and allocation policy | Include hypothetical scenario values in confirmed state |
| Deterministic simulator | Generate events, run ledger, restore buffer, allocate goals, project completion, classify and compare | Call the database, network, clock, random generator or LLM |
| Scenario management | Create immutable branch definitions, resolve ancestry, persist status/results and detect stale baselines | Make a viewed scenario current or overwrite siblings |
| Goal projection/allocation | Apply the frozen ordered allocation, caps, partial completion and rollover rules | Recommend priorities or silently change contribution policy |
| Conversation orchestrator | Turn user text into a typed action, determine clarification, invoke approved use cases and assemble a response | Calculate numbers or expose unrestricted application access to the model |
| LLM adapter | Structured intent interpretation and bounded explanation of supplied facts | Become a source of financial truth or hold authoritative conversation/context state |
| Persistence adapter | Store immutable context/scenario/run records and active-thread messages; enforce ownership and atomic writes | Become the place where financial rules are implemented |
| Authentication adapter | Account access, session validation and authenticated user identity | Collect financial or employer data during signup |
| Employer/benefit representation | Match an optional employer association to curated/mock opportunity records and persist user-visible status | Treat availability as eligibility, uptake or cash-flow impact |

### 2.2 Independently deployable services

No Future You-owned service needs an independent runtime in MVP. A separate simulator service would add deployment, versioning and failure complexity without improving isolation; module and test boundaries are sufficient. Extraction is considered only if another client must execute the engine independently, release cadence diverges, or measured load requires it.

## 3. AI versus deterministic-engine boundary

### 3.1 Authority rule

Every financial claim shown to the user must originate in one of these server-owned structures:

- `FinancialContextSnapshot`
- `SimulationResult`
- `ScenarioComparison`
- `AssumptionManifest`
- versioned curated `BenefitOpportunity` metadata

Model prose is never an authoritative data source. Result cards, classifications, dates, money values, bills coverage, overdraft use, recovery periods and alternatives are rendered from structured deterministic fields.

### 3.2 Technical enforcement

1. **Server-only LLM access.** The browser never calls the model provider and never receives a provider API key.
2. **Discriminated action schema.** Intent interpretation must return exactly one validated `ConversationAction` such as `simulate_one_off_purchase`, `select_existing_scenario`, `explain_selected_result`, `clarify`, `explore_benefit` or `unsupported`.
3. **Narrow tool allowlist.** The orchestrator maps a valid action to a fixed application use case. It does not permit arbitrary code, SQL, web access or a generic calculator.
4. **Server-injected identity.** `userId`, authoritative `contextVersionId`, baseline identity and permissions are never accepted from model arguments. The orchestrator injects them after authentication.
5. **Schema validation twice.** Provider structured output is parsed against JSON Schema at the provider boundary and again against the application's Zod/domain schema. Domain invariants then run independently.
6. **Simulator output validation.** Ledger reconciliation, event uniqueness, non-overallocation, branch ancestry and result-hash checks must pass before a result can be persisted or rendered.
7. **Deterministic presentation model.** Core response copy and all result cards are created from classification/message keys plus simulator facts. The canonical Sarah headline and summary are acceptance-tested templates.
8. **Bounded explanation.** Free-form explanations receive only a fact package and causal ledger references. Money/date tokens in model prose must be present in the supplied fact allowlist; unknown fact references or extra numeric financial claims cause the prose to be discarded and replaced by a deterministic template.
9. **No context mutation tool.** The AI tool registry contains no `update_context`, `activate_benefit`, `commit_scenario` or equivalent operation. Confirmed changes use authenticated, explicit application commands outside the model loop.
10. **No numeric incomplete-benefit tool.** `start_benefit_exploration` can create a draft and return required fields; it cannot evaluate or estimate a result.

### 3.3 Typed boundary examples

```ts
type ConversationAction =
  | {
      kind: "simulate_one_off_purchase";
      amount: MoneyDTO;
      purpose: string;
      paymentPeriod: YearMonthDTO;
      assumptions: {
        paymentPattern: "single";
        fundingSource: "current_account";
        costTreatment: "additional_to_routine_spending";
      };
    }
  | { kind: "select_existing_scenario"; scenarioId: string }
  | { kind: "explain_selected_result"; question: string }
  | { kind: "generate_amount_alternatives"; scenarioId: string }
  | { kind: "simulate_monthly_timing_change"; scenarioId: string; paymentPeriod: YearMonthDTO }
  | { kind: "explore_benefit"; benefitId: string; baseScenarioId: string }
  | { kind: "clarify"; missingFields: ClarificationField[] }
  | { kind: "unsupported"; requestedType: string };
```

The model may propose this structure. The application decides whether the action is supported and safe to execute.

## 4. Deterministic simulation-engine architecture

### 4.1 Engine interface

The domain exposes pure entry points:

```ts
generateBaseline(request: BaselineRequest): BaselineProjection
evaluateScenario(request: ScenarioEvaluationRequest): SimulationResult
compareProjections(request: ComparisonRequest): ScenarioComparison
generateAmountCandidates(request: AmountCandidateRequest): Money[]
```

Every request contains all nondeterministic inputs explicitly:

- immutable financial-context snapshot
- `asOfDate` and requested spending-cycle range
- scenario definition and resolved ancestry
- working-day calendar identifier/version
- projection policy, including six detailed cycles and an explicit completion horizon
- simulation rules version

The engine receives no implicit current time, locale, database lookup, environment-specific money format or network result.

### 4.2 Calculation pipeline

1. Validate context completeness and evidence states.
2. Validate the scenario type against the MVP allowlist.
3. Normalise GBP values to integer pence and dates to branded local-date/year-month values.
4. Generate immutable current-path events for the requested horizon.
5. Resolve scenario ancestry and apply only declared scenario changes.
6. Expand undated routine spending using the specified integer-penny spreading rule.
7. Order ledger events chronologically with dependencies and conservative same-day phases.
8. Execute cash events and record the running cleared balance after every event.
9. At each allocation event, restore the safety buffer before allocating the remaining goal pool.
10. Apply ordered goal caps, partial completion and same-event rollover.
11. Record the six detailed projection periods and continue the goal-only projection to the explicit horizon.
12. Derive required-payment, negative-cash, credit, safety, recovery and goal-impact metrics.
13. Apply the versioned five-level classification rules.
14. Build the assumption manifest and MVP confidence result.
15. Reconcile invariants, canonicalise the result and calculate its content hash.

If any invariant fails, the engine returns a typed failure and no partial affordability result.

### 4.3 Financial-context snapshot

`FinancialContextSnapshot` is immutable and self-contained. It includes:

- context identity, schema version and as-of date
- one participating current account and cleared balance
- reserved active-cycle spending and desired unallocated safety buffer
- fixed monthly net income and payday rule
- routine-spending envelope and any required obligations
- goals and their opening balances/targets
- allocation budget, ordered slots, caps and overflow destination
- upcoming confirmed commitments
- active, sufficiently quantified benefits only
- evidence/source metadata and accepted estimates

Available benefits and eligibility-unknown opportunities are not financial inputs. They can be linked as excluded metadata in the assumption manifest.

For Sarah, the ledger income is the confirmed £2,450 take-home after her current 3% pension contribution and student-loan deduction. Employer pension contributions never enter cash, and the available 3%-to-5% match has no numeric MVP scenario.

### 4.4 Event ledger and ordering

`LedgerEvent` uses signed pence and contains a stable event identity, branch scope, local date, optional exact timestamp, account/goal, event kind, required/discretionary status, evidence and dependencies.

The stable ordering key is:

1. effective date
2. explicit dependency topological order
3. exact timestamp when both competing events have exact times
4. conservative phase when order is otherwise unknown:
   - required debit/repayment
   - ordinary or one-off debit
   - income credit
   - income-dependent goal transfer
   - other discretionary transfer
5. stable source ordinal
6. deterministic event ID

Dependency cycles, duplicate IDs or contradictory account scope are validation failures. An exact dependency overrides the default phase, as required for Sarah's payday-dependent goal transfer.

### 4.5 Baseline generation and cache identity

The baseline is a calculated `BaselineProjection`, not a mutable account record. Its identity is derived from:

```text
contextVersionId
+ contextContentHash
+ rulesVersion
+ calendarVersion
+ projectionPolicy
= baselineInputHash
```

A persisted matching run may be reused. A cache miss recalculates it. Reuse is an optimisation only; the same pure call must reproduce the content.

### 4.6 Scenario branching and inheritance

A `ScenarioDefinition` stores a delta, not a rewritten financial profile. Evaluation:

1. loads the exact baseline context version;
2. walks the declared parent chain;
3. rejects cycles or a parent tied to another baseline;
4. applies ancestor changes followed by the child's declared change;
5. recalculates the complete affected projection.

Amount and timing alternatives are siblings based on B0. A later decision-plus-opportunity is a child of the selected decision scenario, but remains incomplete in MVP. Cloning is therefore structural and immutable rather than a mutable deep copy in storage.

### 4.7 Safety-buffer calculation

At every event:

```text
safety buffer = participating cleared cash - remaining active-cycle reserve
```

The value is not clamped and credit is excluded. The engine records minimum buffer, desired buffer, ratio, event/period, restoration amount per cycle and first recovery allocation event. If the exact day is not justified, the API returns period precision rather than fabricating a date.

### 4.8 Goal allocation, rollover and completion

Goal allocation is a pure state transition. At each uncommitted allocation event it:

1. calculates the current buffer shortfall;
2. diverts up to the normal goal budget to buffer restoration;
3. visits goal slots in the confirmed order;
4. caps transfers at remaining pool, slot cap and amount-to-target;
5. marks completion on the first event reaching target;
6. routes unused money to the confirmed overflow destination in the same event;
7. retains unallocatable money as cash.

Sarah's September transfers are generated as locked events. Scenario recovery does not retroactively cancel them.

### 4.9 Classification

The classifier receives only derived metrics and the versioned threshold table. It applies the hierarchy from the simulation specification:

1. Not currently affordable
2. Financially risky
3. Affordable — significant trade-off
4. Affordable — noticeable trade-off
5. Affordable — minimal impact

The output contains a stable classification code, severity inputs and reason codes. User-facing text is mapped from these codes; the model does not choose or soften the class.

### 4.10 Alternatives

Amount candidates are generated by a pure versioned rule: original, 75% and 60%, rounded half-up to the nearest £50 with duplicates and non-positive results removed. Every candidate is evaluated as a sibling branch.

A timing alternative copies the one-off amount, purpose, funding source, payment pattern and cost treatment, changing only `paymentPeriod`. It does not create a save-first policy or redirect contributions.

### 4.11 Assumptions and confidence

The result manifest separates:

- confirmed facts
- accepted current estimates
- system timing assumptions
- hypothetical changes
- unknown/excluded information

Each entry carries scope, source, affected periods and materiality. MVP emits `High`, `Medium` or `InsufficientInformation`. Full bounded sensitivity and `Low` confidence remain post-MVP.

### 4.12 Reproducibility and rules versioning

Each run persists:

- context schema version and immutable context version ID
- scenario schema version and scenario ID
- `rulesVersion`, for example `fy-sim/1.0.0`
- `engineBuildVersion`/calculation implementation commit, distinct from the rules version
- working-day calendar version/fallback identifier
- projection-policy values
- canonical input hash and output hash
- application build commit

Any change capable of altering ledger events, rounding, goal allocation, dates, classifications, alternatives, assumptions or confidence increments the rules version. The codebase keeps old result records; it does not silently recompute them under new rules. Explicit recalculation creates a new run linked to the old scenario and new rules/context version.

## 5. Conceptual domain model

### 5.1 Entities and aggregates

| Concept | Kind | Key responsibility |
|---|---|---|
| User | Entity | Owns profile, contexts, threads and scenarios; authentication identity is external |
| FinancialContext | Aggregate snapshot | Complete immutable current-path planning state for one version |
| CurrentAccount | Entity inside context | Cleared cash, reserve and balance timestamp |
| Income | Entity inside context | Net amount, recurrence/payday and evidence |
| SpendingEnvelope / SpendingItem | Value/entity inside context | Monthly routine amount, optional categories, dates and required/adjustable meaning |
| RequiredObligation | Entity inside context | Amount, due timing, recurrence and required-payment semantics |
| Goal | Entity inside context | Opening/target balance and contribution eligibility |
| GoalAllocationPolicy | Value object inside context | Budget, ordered slots, caps, buffer-first rule and overflow destination |
| EmployerAssociation | Entity | Optional current workplace link used to discover opportunities |
| BenefitOpportunity | Versioned catalog value/entity | Employer offering and known/unknown terms; no automatic financial effect |
| BaselineProjection | Entity/value result | Current-path calculation anchored to one context/rules version |
| Scenario | Aggregate | Immutable hypothetical definition, ancestry and lifecycle |
| ScenarioChange | Discriminated value | MVP implementation supports `OneOffPurchaseChange` only |
| LedgerEvent | Value object | Ordered signed financial event with provenance and branch scope |
| Projection | Value result | Event trace, detailed periods and goal completion results |
| ProjectionPeriod | Value object | Opening/closing cash, reserve, safety, contributions and goal balances |
| SimulationResult | Value result | Projection plus classification, assumptions, confidence and hashes |
| Assumption | Value object | Fact/estimate/system/hypothetical/unknown entry with materiality |
| Conversation | Aggregate | Decision thread, selected view and related scenario set |
| Message | Entity | User/assistant/system content and structured response references |

### 5.2 Foundational value objects

- `Money { currency: "GBP"; minor: bigint }` in domain code
- `MoneyDTO { currency: "GBP"; minor: string }` across JSON boundaries because JSON has no native `bigint`
- `LocalDate` as a branded `YYYY-MM-DD` value with no implicit timezone
- `YearMonth` as a branded `YYYY-MM` spending-cycle identifier
- `Evidence { state, source, effectivePeriod, lastConfirmedAt, range? }`
- `Scope = CurrentContext | ScenarioBranch`
- `RulesVersion`, `ContextVersionId`, `ScenarioId`, `SimulationRunId` as distinct branded identifiers
- `Result<T, DomainError>` rather than exceptions for expected missing/unsupported states

Domain concepts are not automatically persistence tables. Goals, accounts, income, spending and allocation policy are stored inside the immutable context snapshot because the MVP reads and versions them as one consistency boundary.

## 6. Scenario model and canonical identities

### 6.1 Scenario structure

```ts
interface ScenarioDefinition {
  id: ScenarioId;
  userId: UserId;
  decisionThreadId: DecisionThreadId;
  baselineContextVersionId: ContextVersionId;
  baselineRunId: SimulationRunId;
  parentScenarioId: ScenarioId | null;
  derivedFromScenarioId: ScenarioId | null;
  change: OneOffPurchaseChange | IncompleteBenefitExplorationChange;
  assumptions: Assumption[];
  status: "draft_needs_information" | "evaluated" | "failed";
  createdAt: Instant;
}
```

`parentScenarioId` means the child inherits the parent's hypothetical changes. `derivedFromScenarioId` records why a sibling alternative exists without inheriting that sibling's change. Every evaluated option retains the same baseline anchor.

### 6.2 Canonical Sarah scenario set

| Friendly state | Internal role | Parent | Derived from | Change | MVP status |
|---|---|---|---|---|---|
| Your current path | Baseline B0, not a scenario | — | — | None; Sarah context v1 | Current projection |
| £650 trip | S1 | B0 anchor | — | Additional £650 September one-off | Evaluated |
| £500 option | S1-A500 | B0 anchor | S1 | Amount £500; other assumptions unchanged | Evaluated sibling |
| £400 option | S1-A400 | B0 anchor | S1 | Amount £400; other assumptions unchanged | Evaluated sibling |
| Go in October | S1-TOCT | B0 anchor | S1 | Same £650 payment moved to October | Evaluated sibling |
| Trip + season-ticket loan | S1-O1 | S1 | S1 | Benefit exploration with missing eligibility/terms | `draft_needs_information`; never numeric in MVP |

The user-facing UI never exposes internal IDs. It uses Current, What-if and Needs information labels from the frozen UI mapping.

### 6.3 Integrity rules

- B0 is immutable for the decision thread.
- A scenario definition and successful run are append-only.
- Alternatives never update S1 or one another.
- A selected scenario ID is view state, not financial state.
- Returning to Current path sets the view selection to B0 and retains all options.
- A scenario cannot be marked current through the MVP API.
- A scenario tied to an older current-context version remains readable and gains a derived `based_on_older_context` label.
- Only an explicit authenticated financial-context command can create the next confirmed context version.

## 7. Financial-context versioning

### 7.1 Version model

Each accepted onboarding review or explicit financial-context edit creates a complete immutable `FinancialContextVersion`:

```text
profile.current_context_version_id -> FC-v3

FC-v1 <-superseded-by- FC-v2 <-superseded-by- FC-v3
   |                        |
 old scenario set          current baseline
```

The profile holds only the pointer to the current version. Historical rows and their content hashes are never overwritten.

### 7.2 Input-state separation

| Input state | Storage location | Baseline effect |
|---|---|---|
| Confirmed current value | Current context snapshot | Included |
| Accepted current estimate | Current context snapshot with `estimated` evidence retained | Included and disclosed |
| Unknown value | Context snapshot or incomplete onboarding state | Blocks affected calculation when material |
| Scenario-only value | Scenario definition/assumption manifest | Scenario only |
| Confirmed real-life edit | New immutable context version | Included in new baseline only |
| Available/inactive benefit | Opportunity catalog + user status | None |

### 7.3 Update transaction

`ConfirmFinancialContextChange` requires:

- authenticated user
- `expectedCurrentContextVersionId` for optimistic concurrency
- validated full next snapshot or a command that deterministically produces it
- explicit user confirmation source and timestamp
- reason such as onboarding review, balance edit or goal edit

Within one database transaction it inserts the new version and moves the profile pointer. A stale expected version returns `409 STALE_FINANCIAL_CONTEXT`; it never overwrites newer data.

MVP has no command that converts a hypothetical purchase or benefit into confirmed context. That future operation would create a new context version rather than editing the old one.

## 8. API and use-case contracts

### 8.1 Boundary style

The browser talks to versioned JSON Route Handlers under `/api/v1`. Route handlers are thin adapters over application use cases. Server-rendered pages may call the same use cases directly; they must not duplicate logic or make loopback HTTP calls.

Every command accepts an idempotency/request ID. Every response includes a correlation ID. Ownership comes from the authenticated session, not request/model fields.

### 8.2 Use-case surface

| Use case | Indicative route | Notes |
|---|---|---|
| Read current context | `GET /api/v1/financial-context/current` | Returns versioned summary and onboarding sufficiency |
| Confirm context update | `POST /api/v1/financial-context/versions` | Requires expected current version and explicit confirmation |
| Read goals | `GET /api/v1/goals` | Projection of goals from current context snapshot |
| Create/update goal | `POST/PATCH /api/v1/goals` | Creates a new context version; does not mutate embedded historical goals |
| Generate/read baseline | `POST /api/v1/baselines` | Reuses matching persisted run or calculates it |
| Create one-off scenario | `POST /api/v1/scenarios/one-off-purchases` | Only numeric scenario type in MVP |
| Generate amount alternatives | `POST /api/v1/scenarios/{id}/amount-alternatives` | Creates/reuses sibling options |
| Generate timing alternative | `POST /api/v1/scenarios/{id}/timing-alternatives` | Changes month only |
| Read scenario/result | `GET /api/v1/scenarios/{id}` | Includes deterministic presentation model |
| Compare scenarios | `GET /api/v1/comparisons?baseline=...&scenario=...` | Same baseline required |
| List saved what-ifs | `GET /api/v1/decision-threads/{id}/scenarios` | Groups Current, trip options and incomplete opportunities |
| Return to Current path | `PUT /api/v1/decision-threads/{id}/selection` | Changes view selection only |
| Read opportunities | `GET /api/v1/benefit-opportunities` | Curated/mock data and explicit status |
| Start benefit exploration | `POST /api/v1/scenarios/{id}/benefit-explorations` | Creates draft only; no numeric result |
| Start conversation | `POST /api/v1/decision-threads` | Creates an empty decision thread |
| Send message | `POST /api/v1/decision-threads/{id}/messages` | Orchestrates interpretation, clarification or supported use case |
| Retrieve assumptions | `GET /api/v1/simulation-runs/{id}/assumptions` | Returns the persisted manifest |

There is no separate “request clarification” endpoint. `SendMessage` returns a typed `needs_clarification` response and the required fields; the next message continues the same thread.

### 8.3 One-off scenario request example

```json
{
  "requestId": "req_01",
  "decisionThreadId": "dt_01",
  "expectedContextVersionId": "fc_sarah_v1",
  "change": {
    "type": "one_off_purchase",
    "amount": { "currency": "GBP", "minor": "65000" },
    "purpose": "trip",
    "paymentPeriod": "2026-09",
    "datePrecision": "month",
    "fundingSource": "current_account",
    "paymentPattern": "single",
    "costTreatment": "additional_to_routine_spending"
  },
  "assumptionConfirmations": []
}
```

The API does not accept a user ID, baseline figures, classification or goal dates from the client.

### 8.4 Deterministic result response example

```json
{
  "scenario": {
    "id": "scn_trip_650_sep",
    "label": "£650 trip",
    "status": "evaluated",
    "baselineRunId": "run_b0",
    "parentScenarioId": null,
    "derivedFromScenarioId": null
  },
  "result": {
    "classification": {
      "code": "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
      "label": "Affordable · Significant trade-off",
      "summaryKey": "affordable_meaningful_short_term_buffer_trade_off",
      "reasonCodes": ["BUFFER_RATIO_BELOW_HALF", "RECOVERY_TWO_CYCLES", "GOAL_DELAY_TWO_MONTHS"]
    },
    "hardConsequences": {
      "requiredPaymentsCovered": true,
      "cashNegative": false,
      "creditRequired": false,
      "creditUsed": { "currency": "GBP", "minor": "0" }
    },
    "safety": {
      "preferred": { "currency": "GBP", "minor": "90000" },
      "minimum": { "currency": "GBP", "minor": "25000" },
      "minimumPeriod": "2026-09",
      "minimumDate": null,
      "datePrecision": "month",
      "restoredPeriod": "2026-11",
      "recoveryCycles": 2
    },
    "goals": [
      { "goalKey": "emergency_fund", "baselineCompletion": "2026-12", "scenarioCompletion": "2027-02", "delayMonths": 2 },
      { "goalKey": "holiday", "baselineCompletion": "2027-05", "scenarioCompletion": "2027-06", "delayMonths": 1 },
      { "goalKey": "house_deposit", "baselineCompletion": "2029-06", "scenarioCompletion": "2029-07", "delayMonths": 1 }
    ],
    "confidence": "medium",
    "periods": "six structured ProjectionPeriod objects",
    "assumptionManifest": "structured manifest",
    "trace": "ordered ledger-event references",
    "versions": {
      "contextVersion": "fc_sarah_v1",
      "rulesVersion": "fy-sim/1.0.0",
      "calendarVersion": "weekday-fallback/v1",
      "engineBuildVersion": "git:..."
    },
    "inputHash": "sha256:...",
    "outputHash": "sha256:..."
  },
  "presentation": {
    "headlineKey": "payable_but_buffer_tight",
    "assumptionSummaryKey": "single_current_account_payment_before_payday_additional",
    "availableActions": ["compare_amounts", "view_monthly_path", "view_calculation", "preview_goals"]
  },
  "correlationId": "corr_01"
}
```

The literal string placeholders above describe nested objects; the implemented API returns proper arrays/objects, not those strings.

### 8.5 Error envelope

```json
{
  "error": {
    "code": "NEEDS_FINANCIAL_CONTEXT",
    "messageKey": "financial_context_incomplete",
    "missingFields": ["required_obligations_confirmation"],
    "retryable": false,
    "correlationId": "corr_02"
  }
}
```

No error response contains a guessed number or partial classification.

## 9. Conversation orchestration

### 9.1 Canonical request flow

For “Can I afford a £650 trip next month?” against the August 2026 Sarah snapshot:

1. **Receive.** Persist the user message and request ID in the active decision thread.
2. **Interpret.** The LLM adapter returns a typed `simulate_one_off_purchase` action: GBP £650, trip, September 2026, hypothetical.
3. **Enrich.** The orchestrator adds the approved conservative assumptions: one current-account payment before September payday, additional to routine spending, no credit or goal withdrawal.
4. **Read context.** Load Sarah's current immutable context version and validate baseline sufficiency.
5. **Evaluate missing information.** The conversation policy determines that exact payment day is not blocking; its month-only conservative assumption is recorded.
6. **Generate B0.** Load or calculate the baseline for the exact context/rules/calendar/projection tuple.
7. **Create S1.** Persist the immutable scenario definition anchored to B0.
8. **Simulate.** The pure engine evaluates S1 and compares it with B0.
9. **Validate/persist.** Reconcile the result, persist the immutable run and output hash, and set S1 to evaluated in one transaction.
10. **Build facts.** The application creates the deterministic presentation model: class, £900 to £250 buffer, bills covered, £0 credit, November recovery and three goal-date deltas.
11. **Explain.** The LLM may compose bounded connective prose using only supplied fact IDs. Core headline, classification and numeric cards remain deterministic templates.
12. **Persist/respond.** Persist the assistant message with references to S1/run IDs and return structured message blocks to Ask.

### 9.2 Stage payloads

```text
User text
  -> DecisionInterpretation (model-produced, schema-validated)
  -> ValidatedScenarioCommand (application-produced)
  -> FinancialContextSnapshot + Ruleset + Calendar (repository/config)
  -> SimulationResult + ScenarioComparison (deterministic engine)
  -> ExplanationFacts + PresentationModel (application-produced)
  -> ExplanationDraft (optional model prose, validated)
  -> ConversationResponse blocks (application-produced)
```

If interpretation is malformed, ambiguous across material outcomes or unsupported, the flow stops before creating an evaluated scenario. If explanation fails, the validated deterministic result still uses the canonical template.

## 10. Structured AI tool/function contracts

The provider adapter may implement these as function calls or as one structured `ConversationAction` union. The application semantics are provider-neutral.

| Tool/action | Model-supplied arguments | Server-supplied values | Result |
|---|---|---|---|
| `get_financial_context_summary` | none | authenticated user/current version | Minimal planning summary and completeness; no credentials or unrelated profile data |
| `simulate_one_off_purchase` | amount, currency, purpose, payment month, supported assumptions | user, context, rules, calendar, baseline | Evaluated scenario or typed clarification/error |
| `generate_amount_alternatives` | source scenario ID | ownership, baseline and candidate rules | Independent £650/£500/£400-style siblings |
| `simulate_monthly_timing_change` | source scenario ID, target month | immutable source assumptions and baseline | Independent sibling with timing changed only |
| `compare_scenarios` | scenario IDs | ownership and common-baseline validation | Deterministic comparison |
| `get_goal_impact` | scenario ID | owned run | Baseline/scenario dates, delays and ledger references |
| `get_calculation_assumptions` | run ID | ownership | Structured manifest |
| `list_benefit_opportunities` | optional relevance topic | optional employer association | Curated opportunity metadata and status only |
| `start_benefit_exploration` | benefit ID, base scenario ID | ownership, catalog version | Draft branch and required-information checklist; never numeric in MVP |

### 10.1 Validation rules

- Accept only GBP and positive integer-minor-unit money.
- Accept only the implemented `one_off_purchase` numeric scenario type.
- Resolve relative timing against the server-owned thread snapshot date; persist the resulting absolute `YearMonth`.
- Reject credit, instalment, split funding, goal-savings funding, recurring changes, spending substitution, pension changes and benefit uptake as unsupported rather than approximating them.
- Verify every scenario/run belongs to the authenticated user and expected decision thread.
- Verify compared scenarios share a baseline context and rules version.
- Limit model tool iterations; the canonical flow needs one calculation action. Repeated or cyclic tool requests fail transparently.
- Never execute malformed arguments after “repairing” them with invented values. A safe syntactic normalisation may be applied only when semantically lossless and recorded.
- The model cannot supply result fields, status transitions, context version IDs, rule versions or ownership.

## 11. Persistence model

### 11.1 MVP tables/records

| Record | Important fields | Why it persists |
|---|---|---|
| `profiles` | auth user ID, name, onboarding state, current context version pointer, demo-data flag | Product identity and current-version pointer |
| `financial_context_versions` | user ID, predecessor, schema version, immutable JSONB snapshot, content hash, confirmation reason/time | Historical confirmed context and reproducible baselines |
| `employer_associations` | user ID, employer catalog key/name, status, added time | Optional workplace association separate from auth/context |
| `user_benefit_states` | user ID, benefit catalog key/version, Available/EligibilityUnknown/Active metadata | User-visible opportunity state; numeric effect still excluded unless already in context |
| `decision_threads` | user ID, title, baseline context version, selected-view reference, status | Groups conversation and scenario family across sessions |
| `messages` | thread ID, role, ordered sequence, content blocks JSONB, scenario/run references, prompt/model metadata where applicable | Active decision history and traceability |
| `scenarios` | user/thread/baseline IDs, parent/derived-from IDs, definition JSONB, assumptions, status | Immutable what-if identity and ancestry |
| `simulation_runs` | optional scenario ID, baseline ID, context/rules/calendar versions, canonical inputs, result JSONB, hashes, build ID | Exact replay, audit and protection from silent rule changes |
| `api_request_keys` | user ID, request ID, operation, response reference, expiry | Command idempotency for retries |

The employer/benefit catalog itself is a small versioned fixture in the repository for MVP. It is not a claims system and must be visibly labelled curated/mock data.

### 11.2 Concepts deliberately embedded rather than tabled

Accounts, income, spending items, obligations, goals, allocation policy, accepted estimates and active quantified benefits are embedded in the immutable context JSONB. Assumptions and period/event traces are embedded in scenario/run documents. This keeps the consistency boundary and version history simple.

Create normalised tables later only when a proven query/edit/integration need outweighs snapshot simplicity.

### 11.3 Persisted, derived, cached and ephemeral

| Category | Treatment |
|---|---|
| User account, current context pointer, context versions, goals within context, employer association, benefit status, active thread/messages, scenario definitions | Persisted |
| Successful baseline/scenario result, inputs, assumptions, hashes and versions | Persisted for exact replay and explanation integrity |
| Goal dates, classifications, period totals, safety metrics and comparisons | Deterministically derived; successful run snapshot also persisted as evidence of what was shown |
| Matching baseline/result by canonical input hash | Reusable cache in `simulation_runs`; no Redis |
| Composer draft, open sheet, expanded card, scroll position, calculating animation | Ephemeral frontend state |
| Selected scenario | Persisted on the thread only as a convenience; it never changes financial context |
| Failed LLM raw payload | Not persisted by default; retain redacted error metadata only |

Storing a result is justified even though it is reproducible: it preserves exactly what the user saw when rules or context later change. Recalculation creates another immutable run rather than overwriting the earlier result.

## 12. Authentication and onboarding

### 12.1 Flow separation

```text
Account authentication
  -> minimum financial onboarding
  -> explicit review/confirmation
  -> first context version + baseline
  -> optional workplace association
  -> Home / Ask
```

Authentication collects email/password or an equivalent Supabase Auth credential only. Creating `profiles` sets `onboardingState = financial_context_required`; it does not ask for an employer.

Financial onboarding builds a draft snapshot in server-validated session state. The user supplies the exact minimum fields from the MVP specification: cash/balance date, net income/payday, routine spending, required-obligation confirmation, desired buffer, at least one goal and the allocation order. Only the Review confirmation creates version one and permits a numeric baseline.

Workplace association is a separate, skippable step after the financial snapshot is confirmed. Skipping it hides employer-specific opportunities but never blocks Home, Ask, Goals or simulation.

### 12.2 Sarah demo data

Sarah v1 lives in a read-only versioned fixture used by tests and demo seeding. A demo action copies the exact fixture into the authenticated demo user's records and marks the profile `is_demo_data = true`; it must not use one shared mutable Sarah account. Any product UI for loading demo data remains environment-gated.

## 13. Frontend component and state architecture

### 13.1 Route versus state mapping

| Product area | Route | Primary client/server state |
|---|---|---|
| Authentication | `/login`, `/signup` | Auth form and session state only |
| Financial onboarding | `/onboarding/financial` | Draft steps, validation, review and confirm command |
| Optional workplace | `/onboarding/workplace` | Skippable employer association |
| Home | `/home` | Current-path summary, supported prompts and opportunity preview |
| Ask | `/ask` and optional `/ask/{threadId}` | Conversation plus result/scenario state machine |
| Goals | `/goals` | Current-path list or explicit scenario-preview state |
| Benefits | `/benefits` | Opportunity cards and Needs information handoff |

The following are **not routes**:

- calculating state
- £650 result
- selected £500/£400/October option
- before/after expansion
- assumptions editor
- scenario selector
- How we calculated this
- benefit missing-information summary

They are local states, sheets or expanders inside the frozen destinations.

### 13.2 Component responsibilities

- `AppShell`, `BottomNavigation`, `ProductHeader`
- `DecisionPromptHero`, `SupportedPromptCarousel`, `CurrentPathPreview`
- `AskComposer`, `ConversationTimeline`, `ConversationMessageBlock`
- `ResultHeroCard`, `ImmediateImpactStrip`, `FutureImpactCard`
- `ScenarioViewingPill`, `ScenarioSelectorSheet`, `AlternativeCards`
- `MonthlyPathDisclosure`, `CalculationDisclosure`, `AssumptionsSheet`
- `GoalCard`, `GoalScenarioPreviewBanner`
- `BenefitOpportunityCard`, `BenefitNeedsInformationSheet`
- onboarding step components and `FinancialContextReview`

Components receive serialisable presentation models. No card imports simulator functions or derives its own completion dates/classifications.

### 13.3 State ownership

- Server/database: context, baseline/run references, messages, scenarios and benefit status.
- URL: product destination and optional thread ID; a scenario preview query parameter may deep-link to an existing owned scenario.
- Ask reducer: current request lifecycle, selected view, open panels and received structured blocks.
- Local component state: open/closed sheet, carousel position and unsubmitted composer text.

Use a reducer/state machine for Ask rather than independent booleans, preventing impossible combinations such as `calculating` and `needs_information` for the same request.

## 14. Ask frontend state model

### 14.1 State shape

```ts
interface AskViewState {
  threadId: string;
  messages: ConversationBlockDTO[];
  currentPath: BaselineSummaryDTO;
  scenarios: ScenarioSummaryDTO[];
  selectedView: { kind: "current_path" } | { kind: "scenario"; scenarioId: string };
  selectedComparison: ScenarioComparisonDTO | null;
  alternatives: ScenarioSummaryDTO[];
  assumptions: AssumptionManifestDTO | null;
  request:
    | { status: "idle" }
    | { status: "interpreting"; requestId: string }
    | { status: "calculating"; requestId: string }
    | { status: "needs_information"; requestId: string; fields: ClarificationFieldDTO[] }
    | { status: "failed"; requestId: string; error: SafeErrorDTO };
  panels: {
    scenarioSelector: boolean;
    alternatives: boolean;
    assumptions: boolean;
    calculation: boolean;
  };
}
```

### 14.2 Transitions and invariants

| Event | Transition | Financial mutation? |
|---|---|---:|
| Submit message | Idle -> Interpreting/Calculating | No confirmed-context mutation |
| Result received | Add message/scenario; select returned scenario; request -> Idle | No |
| Clarification required | request -> Needs information | No evaluated scenario unless a draft is explicitly required |
| Select £500/£400/October | Change `selectedView`; fetch existing structured result | No |
| Open/close sheet | Change `panels` only | No |
| Edit supported assumption | Submit command that creates another scenario | No |
| View impact in Goals | Navigate with explicit scenario preview reference | No |
| Return to Current path | `selectedView = current_path` | No |
| Context edit confirmed outside Ask | New current context/version; existing options become older-context | Yes, explicit version creation only |

B0 remains pinned and is never replaced in the reducer. A selected scenario is only a pointer. The server re-authorises every selected scenario; client state is not trusted.

## 15. Technology choices

The repository currently contains specifications only, so there is no existing runtime to preserve. The proposal favours a single-language stack and managed services with minimal operational work.

### 15.1 Recommended stack

| Area | Choice | Why it fits | Alternatives not chosen now | Meaningful risk |
|---|---|---|---|---|
| Language | TypeScript in strict mode | One type system across UI, API, schemas and pure engine; good fit for rapid full-stack iteration | Separate Python backend would split contracts and duplicate types | TypeScript types do not replace runtime validation |
| Web/application | Next.js App Router with React and Route Handlers | One responsive deployable app; server/client separation; enough backend capability without a second service. Official Next.js docs define Route Handlers as request handlers inside the App Router. | Vite + Express duplicates project setup; NestJS adds layers before they are needed; mobile-native is outside web MVP | Must keep domain logic out of framework files and be deliberate about server/client boundaries |
| Styling/UI primitives | Tailwind CSS with CSS-variable design tokens; Radix primitives for dialog/sheet behaviour | Fast reproduction of the supplied palette/gradients/rounded mobile layout with accessible behaviour | A full component kit could fight the supplied identity; CSS-in-JS adds runtime/tooling | Utility classes can become inconsistent unless tokens and shared components are enforced |
| Runtime schemas | Zod at API, persistence-mapping and AI boundaries | Same schemas can validate browser payloads and model structured output | Hand-written guards drift; generated-only types do not validate runtime data | Avoid making domain rules live only in Zod refinements |
| Database/auth | Supabase managed PostgreSQL + Supabase Auth | One provider for relational persistence and account sessions; JSONB and immutable records fit projections; RLS supports database-level user isolation. Supabase's official guidance requires RLS/grants on exposed tables. | SQLite is excellent locally but risky for shared serverless demo persistence; Firebase's document model is less natural for relational ownership/version links; separate Auth + Postgres vendors add coordination | Vendor coupling in auth/client APIs; RLS policies require tests; availability and region must be confirmed |
| Data access | Supabase server client with generated database types and SQL migrations | Passes the authenticated JWT through server code so RLS remains effective; avoids adding an ORM for a small schema | Drizzle is credible if query volume grows, but introduces another schema/mapping layer; direct service-role SQL risks bypassing RLS | Atomic multi-record commands need small tested PostgreSQL functions or carefully scoped transactions |
| Domain tests | Vitest | Fast TypeScript unit/table tests; supports pure engine without framework | Jest is also viable but offers no clear benefit for this clean repository | None material |
| Browser tests | Playwright | Covers the mobile golden path, browser projects and traceable UI failures; official docs support isolated multi-browser runs | Cypress is viable but would add another style with no current advantage | Browser CI is slower, so keep a focused golden-path suite |
| Hosting | Vercel for the Next.js app | Minimal deployment work, previews and environment configuration | Generic containers/Fly/AWS add operations before needed | Serverless request limits and provider coupling; revisit only if measured |
| CI | GitHub Actions | Simple lint, typecheck, unit, integration, migration and Playwright gates | Dedicated CI platform is unnecessary | Secrets and preview database isolation must be configured carefully |
| Observability | Structured redacted application events in hosting logs, behind a telemetry port | No extra production service is required for MVP; adapter can later target Sentry/OpenTelemetry | Adding Sentry immediately creates another data processor/account | Platform log retention and querying may be limited; revisit before wider beta |

The relevant current references are the [Next.js Route Handlers documentation](https://nextjs.org/docs/app/getting-started/route-handlers), [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Playwright test documentation](https://playwright.dev/docs/running-tests).

### 15.2 Deliberately absent infrastructure

No Redis, queue, worker, websocket service, vector database, search index, object store, analytics warehouse or separate API server is needed. The request lifecycle is synchronous; calculation is local and bounded, and persistence volume is small.

## 16. LLM provider and model strategy

### 16.1 MVP recommendation

Use the OpenAI Responses API behind a Future You-owned `LanguageModelPort`, with **GPT-5.6 Luna as the initial model candidate** for both structured interpretation and short bounded explanations. The current official model comparison describes Luna as cost-sensitive and lists Responses, function calling and structured outputs as supported. Final production pinning is conditional on the Future You eval suite and account availability; if Luna misses interpretation/explanation thresholds, test GPT-5.6 Terra through the same adapter rather than changing domain code.

The model ID is environment configuration, not imported throughout the application. Development can use the family alias while evaluating; the demo release should pin a tested snapshot when one is available to the account and record the exact model on each AI-assisted message.

Relevant official references are the [OpenAI model comparison](https://developers.openai.com/api/docs/models/compare) and [Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create), which documents structured JSON output and strongly typed custom function calls.

### 16.2 Provider-neutral port

```ts
interface LanguageModelPort {
  interpretDecision(input: InterpretationInput): Promise<DecisionInterpretation>;
  explainFacts(input: ExplanationInput): Promise<ExplanationDraft>;
}

interface ModelInvocationMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  requestId: string;
  latencyMs: number;
  finishStatus: string;
}
```

OpenAI-specific response IDs, SDK types and error objects remain inside `infrastructure/ai/openai`. The application owns prompts, schemas, retry policy and conversation state. Replacing the provider therefore means implementing the two port methods and passing the same boundary tests.

### 16.3 Model responsibilities

The model is used for:

- classifying a message into the supported conversation-action union;
- extracting amount, purpose and timing from natural language;
- identifying genuinely missing material parameters;
- understanding follow-ups such as “What about £500?” against structured thread memory;
- choosing whether the user is asking to select, compare, explain or explore an opportunity;
- returning a symbolic plan that selects only approved templates, trusted fact keys, caveat keys,
  follow-up action keys and tone identifiers.

The model is never used for:

- money/date arithmetic, event generation or projection;
- classification, alternative generation or confidence calculation;
- deciding that bills are covered or that credit is unused;
- mutating context, scenario status or benefit status;
- retrieving another user's data;
- numerical benefit, pension, credit, instalment or save-first modelling;
- acting autonomously or initiating financial actions.

### 16.4 Structured output and prompts

Use strict JSON Schema/structured outputs. Prompts are versioned files in the repository and contain:

- the supported `ConversationAction` schema;
- the clarification policy and unsupported-type list;
- the instruction that model output is a proposal subject to server validation;
- no Sarah-specific arithmetic or hard-coded result values;
- examples used only to teach intent shape, not to calculate.

The explanation prompt receives stable symbolic fact IDs and availability metadata, not formatted account,
income, goal-balance or result values. It returns only a strict explanation plan. The server validates every
template/fact reference and renders all final sentences, amounts, dates, classifications and labels from
the immutable stored result DTO. Prompt/version metadata is retained with the assistant message, but raw
chain-of-thought and raw provider output are neither requested nor stored.

### 16.5 Retry and failure behaviour

- Retry once for transient provider timeouts, connection failures, `429` or provider `5xx`, with short exponential backoff and jitter.
- Do not retry schema-invalid output indefinitely. One constrained re-request is the maximum; then use a typed failure or deterministic explanation fallback.
- Repeated function calls use the same idempotency key and pure simulation input, so they cannot create duplicate branches/runs.
- Cap the model's tool/action loop. The canonical path needs one calculation action; follow-ups normally need one action.
- Provider unavailability before intent is understood returns a transparent `AI_TEMPORARILY_UNAVAILABLE` state with Retry. It does not guess the request.
- Provider failure after a deterministic result exists returns the canonical template and records `explanationMode = deterministic_fallback`.
- Existing scenarios, scenario selection, amount cards, timing cards, assumptions and goal previews remain usable without the provider because their data is already deterministic.
- The simulator remains independently callable through application/API tests. The MVP does not add an unapproved user-facing purchase form merely to bypass a failed natural-language interpreter.

### 16.6 Data minimisation at the provider boundary

Send only the information required for the current action:

- bounded recent message text and structured decision-thread memory;
- exact source quotes and semantic timing data necessary to interpret the current decision;
- symbolic available-fact IDs needed to plan an explanation, without unrelated financial values;
- a hashed/pseudonymous safety identifier, not Sarah's email or database identity.

Do not send account credentials, authentication tokens, raw database records, unrelated conversations or full employer/profile data. Use provider-side storage disabled where supported (for OpenAI, request `store: false`), while recognising that this setting alone is not a claim of zero retention. Provider contractual/retention settings must be reviewed before real financial data is used.

Final financial prose is server-owned. Clarification, scope and provider-failure messages are also selected
from server templates. Unknown or unavailable provider-selected facts are rejected; explanation failure
leaves the stored deterministic result visible and uses a deterministic fallback.

## 17. Simulator implementation strategy

### 17.1 Money

- Parse API money strings into domain `bigint` pence immediately.
- Perform every debit, credit, allocation, ratio numerator and rounding step in integer arithmetic.
- Represent ratios as rational numerator/denominator pairs until a comparison or display value is required.
- Implement half-up-to-£50 candidate rounding as a named pure function with boundary tests.
- Never use JavaScript `number` for money or binary floating point for classification thresholds.
- Serialise money as `{ currency: "GBP", minor: "65000" }`; format `£650` only in the presentation layer.

### 17.2 Dates and cycles

- Use branded `LocalDate` and `YearMonth` strings in the domain; never let browser timezone conversion determine a ledger date.
- Pass `asOfDate` explicitly.
- Implement `PaydayRule` and `WorkingDayCalendar` ports as pure inputs.
- Persist the resolved absolute month for phrases such as “next month.”
- Preserve date precision (`exact`, `range`, `month`) and return the same precision to the UI.
- Keep the engine in calendar dates/cycles; use instants only for audit timestamps outside calculations.

### 17.3 Pure modules

The domain is split into focused pure modules:

- context validation and sufficiency
- event generation
- routine-envelope spreading
- dependency/event ordering
- ledger execution and reconciliation
- safety metrics/recovery
- goal allocation and rollover
- goal completion projection
- classification
- alternatives
- assumption/confidence manifest
- comparison and presentation fact extraction

No module reads environment variables. The application layer creates `SimulationRuleset` and `ProjectionPolicy` and passes them in.

### 17.4 Scenario cloning

Do not clone mutable class instances. Resolve the immutable baseline snapshot and scenario-change ancestry into a new evaluation request. Read-only input objects are frozen in development/test and never modified by calculation functions. The result owns new state arrays/maps.

### 17.5 Projection horizon

The detailed horizon is exactly six spending cycles for MVP. Goal projection continues until all supported goals complete or the explicit `maxProjectionCycles` request/ruleset value is reached. Because the product-wide maximum is unresolved, Sarah acceptance tests pass an explicit fixture horizon; release configuration must not be selected without recording U-01.

When a goal does not complete, return `not_reached_within_horizon` plus its closing balance. Never extrapolate a date outside calculated events.

### 17.6 Versioned Sarah fixture

Create one canonical fixture module/JSON document containing Sarah v1's context snapshot, expected baseline, £650 scenario, rules/calendar/projection inputs and expected outputs. The fixture must be imported by tests and demo seeding; production UI components must not duplicate Sarah values.

Fixture changes require explicit product-contract review. A snapshot update is not allowed merely to make an implementation test pass.

## 18. Testing strategy

### 18.1 Unit tests

| Module | Required test focus |
|---|---|
| Money/rounding | Pence parsing, signed arithmetic, half-up £50 boundaries, no floating point |
| Event generation | Paydays, routine-spending penny distribution, one-offs, locked transfers |
| Event ordering | Required debits first, income dependencies, stable ties, cycle detection |
| Ledger | Opening/event/closing reconciliation, minimum cash and required-payment timing |
| Buffer | Reserve separation, negative values, ratio and first recovery event |
| Goal allocation | Buffer-first diversion, ordered caps, no overfunding, retained remainder |
| Rollover | Partial completion and same-event overflow |
| Goal dates | Exact completion event, delays, acceleration and horizon exhaustion |
| Classification | Every severity threshold and hierarchical hard/risky precedence |
| Alternatives | 75%/60% candidate generation, duplicate removal and timing-only change |
| Assumptions/confidence | Correct evidence buckets, material blocking and MVP confidence values |
| Scenario ancestry | Siblings, children, baseline mismatch and cycle rejection |

Property/invariant tests should cover conservation of money, deterministic repeat calls, non-overfunded goals and baseline immutability across arbitrary valid one-off amounts.

### 18.2 Sarah v1 executable acceptance mapping

`tests/acceptance/sarah-v1.acceptance.test.ts` must contain cases named with the exact 19 IDs:

| Test ID | Executable assertion |
|---|---|
| SARAH-B-001 | Every displayed baseline closing cash value is 275000 pence |
| SARAH-B-002 | Every displayed baseline closing buffer is 90000 pence |
| SARAH-B-003 | Baseline emergency fund completes `2026-12` |
| SARAH-B-004 | Baseline holiday completes `2027-05` |
| SARAH-B-005 | Baseline house deposit completes `2029-06` |
| SARAH-T-001 | Scenario adds exactly one 65000-pence September debit marked additional |
| SARAH-T-002 | September locked goal transfers total 60000 pence |
| SARAH-T-003 | September closing cash is 210000 pence |
| SARAH-T-004 | September closing buffer is 25000 pence |
| SARAH-T-005 | Lowest cash is 25000 pence and credit use is zero |
| SARAH-T-006 | October buffer restoration is 60000 pence and goal allocation is zero |
| SARAH-T-007 | November restores 5000 and allocates 25000/20000/10000 to emergency/house/holiday |
| SARAH-T-008 | Buffer first reaches 90000 pence again in `2026-11` |
| SARAH-T-009 | Scenario emergency fund completes `2027-02` |
| SARAH-T-010 | Scenario holiday completes `2027-06` |
| SARAH-T-011 | Scenario house deposit completes `2029-07` |
| SARAH-T-012 | February goal total is 1380000 pence and 65000 below baseline |
| SARAH-T-013 | Class code is `AFFORDABLE_SIGNIFICANT_TRADE_OFF` |
| SARAH-T-014 | Deterministic summary key renders the frozen approved wording exactly |

The acceptance suite also tests the frozen supported alternatives:

- £500: £400 minimum buffer, October recovery, January/June/June goal dates, Significant trade-off
- £400: £500 minimum buffer, October recovery, January/June/June goal dates, Noticeable trade-off
- October £650: September £900 buffer, October £250 low/£850 close, November recovery, February/June/July goal dates, Significant trade-off

### 18.3 API and persistence integration tests

- Authentication/ownership is injected rather than accepted from payloads.
- Creating S1 twice with the same request ID returns the same scenario/run.
- Amount alternatives are independent siblings from B0.
- October changes only payment period.
- Scenario/run/message persistence is atomic for a successful response.
- Context update creates a new version and marks earlier scenarios as older-context without rewriting them.
- Returning to Current path changes only selection.
- A benefit exploration persists `draft_needs_information` without a run.
- RLS tests prove user A cannot list, fetch, compare or mutate user B's records.
- Hash-based baseline reuse returns content identical to recalculation.

### 18.4 AI boundary tests/evals

Use a fake provider for deterministic integration tests and a small opt-in provider eval set for release checks.

Required cases include:

- canonical question maps to the exact supported command;
- “What about £500?” reuses purpose/month/funding from thread memory;
- “What if I wait until October?” changes timing only;
- missing amount returns clarification;
- instalment, credit, recurring-rent, save-first and pension prompts return unsupported/clarification without a numeric run;
- provider attempts to supply a classification or goal date are ignored/rejected;
- malformed money, unknown scenario IDs and foreign-owned IDs are rejected;
- an explanation containing a financial number absent from `ExplanationFacts` falls back to the deterministic template;
- absent simulator facts cannot be filled by model text;
- prompt-injection text cannot expose tools, secrets, another user or context mutation;
- provider timeout before interpretation yields the unavailable state; timeout after calculation yields deterministic prose.

### 18.5 UI tests

Playwright covers the mobile viewport golden path:

1. returning Sarah lands on Home with no large bank-balance hero;
2. supported prompt opens Ask and focuses the composer;
3. submit shows calculating, then exact £650 result cards;
4. before/after, six-month path and assumptions expand correctly;
5. £500 and £400 selection changes viewed data without removing S1/B0;
6. October option appears and is not labelled better;
7. Goals preview remains Hypothetical and current balances do not change;
8. season-ticket exploration shows Needs information and no numeric card;
9. Current path restores baseline view while all what-ifs remain listed;
10. keyboard, screen-reader labels, focus return, reduced motion and non-colour status cues work for sheets/cards.

### 18.6 CI gates

Every pull request runs formatting/lint, strict typecheck, unit tests, all Sarah acceptance tests, API/DB integration tests and the focused Chromium/mobile Playwright path. Main/demo deployment additionally runs the provider eval set only when protected provider credentials are available; provider availability must never gate pure simulator tests.

## 19. Failure and incomplete-information behaviour

### 19.1 Typed failures

| Condition | Application code/status | UI/conversation behaviour | Prohibited behaviour |
|---|---|---|---|
| Missing baseline context | `NEEDS_FINANCIAL_CONTEXT` / 422 | Ask for the minimum missing field or route to onboarding; no class/result card | Guessing from averages or demo data |
| Unsupported scenario type | `UNSUPPORTED_DECISION_TYPE` / 422 | Explain MVP boundary and, where useful, request a single one-off amount/month version | Approximate recurring, credit, instalment, pension or save-first effects |
| Invalid monetary value | `INVALID_MONEY` / 400 | Identify the amount field and ask for a valid positive GBP value | Coercing ambiguous text to a guessed amount |
| Missing scenario assumption | `NEEDS_CLARIFICATION` / 422 | Ask only material missing details and retain thread | Selecting an account/funding plan that changes safety materially |
| Unknown benefit terms | Successful draft with `draft_needs_information` | Show required checklist, no numeric card, keep base scenarios unchanged | Estimating eligibility, savings or repayments |
| Simulator validation/invariant failure | `SIMULATION_FAILED` / 500 | Safe error, retry/correlation ID; no partial result | Passing model prose or partially calculated values as the answer |
| LLM interpretation failure | `AI_TEMPORARILY_UNAVAILABLE` / 503 or `AI_OUTPUT_INVALID` / 502 | Retry state; no new calculation unless a valid command exists | Regex/LLM guess that may change product meaning |
| LLM explanation failure after simulation | Successful result with deterministic fallback | Show verified result and canonical copy | Withholding a valid result solely because prose failed |
| Persistence failure | `PERSISTENCE_UNAVAILABLE` / 503 | Keep unsent composer text locally, say result was not saved, allow idempotent retry | Claiming a scenario/history was saved |
| Stale context version | `STALE_FINANCIAL_CONTEXT` / 409 | Reload/review current context; retain historical scenario | Silently recalculating or overwriting against new context |

### 19.2 Orchestration transaction behaviour

The user's message is persisted first with its request ID. Interpretation and calculation occur outside a long database transaction. A successful scenario definition, simulation run and assistant response are then saved atomically. If that transaction fails, no evaluated scenario is visible and the same request ID can retry safely.

Expected failures create safe typed conversation blocks where persistence is available. Raw stack traces, provider payloads, SQL errors and secrets never reach the user.

## 20. Security and privacy

These are MVP security requirements, not a claim of FCA, PCI DSS, ISO 27001, GDPR or other regulatory certification/compliance.

### 20.1 Authentication and sessions

- Supabase Auth manages email/password or approved equivalent credentials.
- Use secure, HTTP-only, SameSite cookies for browser sessions where supported by the server integration.
- Validate the session on every protected Route Handler and server-rendered product route.
- Apply email verification and password/reset protections appropriate to the demo environment.
- Protect state-changing endpoints with same-origin checks and framework-appropriate CSRF protection.

### 20.2 Authorisation and data isolation

- Every user-owned record carries `user_id`; repository methods require an authenticated `UserId` parameter.
- Enable RLS and least-privilege grants for every exposed table. Policies use the authenticated subject and are covered by cross-user tests.
- Do not use Supabase secret/service credentials for ordinary user paths. If an administrative migration/seed needs them, keep that path outside the browser request flow.
- Scenario comparisons verify ownership, thread membership and common baseline before loading financial payloads.
- Demo Sarah data is copied per demo user, never exposed through a shared writable account.

### 20.3 Secrets and encryption

- Store provider keys, database migration credentials and signing secrets only in encrypted hosting/CI environment stores.
- Expose only documented publishable browser values; never expose the OpenAI key, database password or Supabase secret key.
- Require TLS for browser, database and AI-provider traffic.
- Use the managed providers' encryption at rest, but verify plan/region/retention details before real-user rollout rather than making unsupported guarantees.
- Rotate compromised credentials and maintain separate local/test/demo values.

### 20.4 Logging and redaction

- Do not log message text, prompt bodies, account balances, income, spending, goal balances, employer details, email or authentication tokens by default.
- Log opaque IDs, input/output hashes, versions, duration, status/error codes and redacted provider metadata.
- Ensure validation and exception serializers cannot dump request bodies or context snapshots.
- Limit access and retention for production logs; document any temporary debug override and keep it off in demo/production.

### 20.5 AI-provider exposure and prompt safety

- Send the minimum structured context described in section 16.6.
- Treat all user/model text as untrusted data, not application instructions.
- The model has no database/network/generic-code tool and cannot select ownership or context identifiers.
- Validate fact references and tool arguments after the model call.
- Review provider data processing, storage and regional settings before real financial data is entered.

### 20.6 Input and abuse controls

- Validate payload size, content type, schema, string length, identifier format and GBP-only money at the API edge.
- Parameterise all SQL; never build queries from message text.
- Escape/render model and user text as text, not trusted HTML.
- Apply authenticated per-user rate limits to conversation/model endpoints and a higher separate limit to deterministic scenario reads/calculations. Return `429` with `Retry-After`.
- Keep limits configurable and tune them before a public demo. A small Postgres-backed fixed-window counter is sufficient; do not add Redis solely for MVP rate limiting.
- Use request IDs and concurrency caps to prevent repeated model/tool loops and duplicate scenarios.

## 21. Observability

### 21.1 Minimum event set

Emit structured events through a `TelemetryPort`:

| Event | Fields safe to record |
|---|---|
| `simulation.started/completed/failed` | correlation ID, anonymous user hash, scenario type, input hash, engine/calculation build, rules/calendar versions, duration, error code |
| `baseline.cache_hit/miss` | input hash prefix, rules version, duration |
| `scenario.created` | opaque scenario/thread IDs, relationship type, status |
| `llm.interpretation.completed/failed` | provider, model, prompt/schema versions, duration, retry count, action kind/error code |
| `llm.explanation.completed/fallback` | provider/model, duration, validation result, fallback reason |
| `tool.validation_failed` | tool/action name, validation code; no raw arguments |
| `conversation.orchestration.failed` | stage name, correlation ID, safe error code |
| `context.stale` | opaque expected/current version IDs |
| `persistence.failed` | repository operation, database error class, correlation ID |
| `ui.golden_path_error` | route/state, correlation ID, safe client error code |

### 21.2 Timing and health

Record separate durations for authentication, context lookup, model interpretation, simulation, model explanation and persistence. This distinguishes provider latency from calculation latency.

A minimal health endpoint reports application build and configuration presence without exposing secrets or calling the LLM. Database/provider readiness belongs in deployment smoke tests, not a public endpoint that leaks dependency details.

### 21.3 Privacy rule

Observability answers “which component/version failed and how long did it take?” It does not recreate Sarah's financial life. Hashes and opaque IDs support correlation without logging the underlying values.

## 22. Repository and module structure

Use one Next.js project with explicit internal layers rather than a multi-package workspace at MVP size:

```text
future-you/
├── docs/
│   ├── simulation-rules-specification.md
│   ├── golden-path-conversation-specification.md
│   ├── golden-path-ui-mapping.md
│   ├── mvp-specification.md
│   └── technical-architecture-specification.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (onboarding)/
│   │   ├── (product)/
│   │   │   ├── home/
│   │   │   ├── ask/
│   │   │   ├── goals/
│   │   │   └── benefits/
│   │   └── api/v1/                 # thin Route Handler adapters
│   ├── ui/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── home/
│   │   │   ├── ask/
│   │   │   ├── goals/
│   │   │   ├── benefits/
│   │   │   └── onboarding/
│   │   └── design-system/          # tokens, shared primitives, icons
│   ├── application/
│   │   ├── use-cases/
│   │   ├── ports/                  # repositories, auth, LLM, calendar, telemetry
│   │   ├── dto/
│   │   └── errors/
│   ├── domain/
│   │   ├── shared/                 # Money, dates, IDs, Result
│   │   ├── financial-context/
│   │   ├── scenarios/
│   │   ├── simulation/
│   │   │   ├── events/
│   │   │   ├── ledger/
│   │   │   ├── safety/
│   │   │   ├── goals/
│   │   │   ├── classification/
│   │   │   ├── alternatives/
│   │   │   └── assumptions/
│   │   └── conversations/
│   ├── ai/
│   │   ├── contracts/
│   │   ├── prompts/
│   │   ├── orchestration/
│   │   └── validation/
│   ├── infrastructure/
│   │   ├── auth/supabase/
│   │   ├── persistence/supabase/
│   │   ├── ai/openai/
│   │   ├── calendar/
│   │   └── telemetry/
│   └── fixtures/
│       ├── sarah-v1/
│       └── benefit-catalog/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
│   ├── unit/
│   ├── acceptance/
│   ├── integration/
│   ├── ai-boundary/
│   └── e2e/
└── public/
```

Enforce import direction with ESLint rules:

- `domain` imports only `domain` and standard-library code.
- `application` may import `domain`, never concrete infrastructure.
- `ai` may import application contracts/DTOs but never persistence adapters.
- `infrastructure` implements application ports.
- `ui/app` call application/API DTOs and never import ledger/classification internals.

If the simulator later needs independent publication, `src/domain` can move to a package without redesigning it. Creating that package now offers little value.

## 23. Deployment architecture

### 23.1 Runtime topology

```text
User browser
   -> Vercel-hosted Next.js application
        -> Supabase Auth + PostgreSQL
        -> OpenAI Responses API
```

The Next.js application serves UI and Route Handlers. Simulation runs in the server process as pure synchronous code. No background worker is needed because one-off projections are bounded and must return in the conversation request.

### 23.2 Environments

- **Local/test:** local environment values, deterministic fake LLM by default, ephemeral/test PostgreSQL or local Supabase, frozen Sarah fixture.
- **Demo:** hosted application, dedicated Supabase project, real provider only when configured, clearly labelled Sarah demo profile.
- **Later production:** separate project/keys/retention settings; not implied by the demo environment.

Do not let preview deployments use or mutate the demo/prod database. They use an isolated test project or run without persistence using test adapters.

### 23.3 Environment configuration

At minimum:

```text
APP_ENV
APP_BUILD_SHA
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
DATABASE_MIGRATION_URL          # CI/deploy only, never browser/runtime output
OPENAI_API_KEY                  # server only
OPENAI_MODEL
OPENAI_PROMPT_VERSION
SIMULATION_RULES_VERSION
CALENDAR_VERSION
MAX_PROJECTION_CYCLES           # unresolved product configuration; must be explicit
LOG_LEVEL
```

Configuration is validated at startup/build. A missing provider key may permit deterministic test/demo mode only when an explicit environment flag selects the fake adapter; it must not silently fake AI in a real-user environment.

### 23.4 CI and deployment flow

1. Pull request runs lint, typecheck, unit, 19 Sarah acceptance cases, integration and focused Playwright tests.
2. Database migrations are checked against an ephemeral/test database, including RLS tests.
3. Build creates an immutable application artifact/preview.
4. Merge to main reruns gates.
5. Approved database migrations are applied to the demo environment using CI-held migration credentials.
6. Vercel deploys the matching application build and environment configuration.
7. Smoke tests authenticate a demo user, load Sarah v1, calculate B0/S1 and verify rules/build versions.
8. Rollback restores the previous application build. Because migrations are forward-only, schema changes must be backward compatible for at least one release.

Sarah seeding is explicit and idempotent. It does not run on every application startup.

## 24. Architecture decisions and trade-offs

| ADR | Decision | Rationale | Trade-off | Revisit when |
|---|---|---|---|---|
| ADR-001 | Use one modular monolith | Fastest credible path with strong code boundaries and one deployment | Modules share a process/failure domain | Independent client/runtime, release cadence or measured scaling needs appear |
| ADR-002 | Make the pure simulator the sole financial authority | Determinism, testability and protection from model hallucination | More schemas/template work at boundaries | Never revisit the authority rule; only implementation form may change |
| ADR-003 | Keep AI orchestration server-side and typed | Protects keys/data and constrains tools | Less flexible than an open-ended agent | New supported use cases have deterministic contracts and need richer orchestration |
| ADR-004 | Store immutable financial-context snapshots in JSONB | Simple versioning and exact replay for a small bounded context | Harder ad hoc SQL analytics/field updates | Integrations or frequent independent entity edits/querying dominate |
| ADR-005 | Store successful calculated result snapshots as well as reproducible inputs | Preserves exactly what the user saw across rules changes | Duplicates derived data | Storage cost/volume becomes material and an equivalent audit mechanism exists |
| ADR-006 | Represent scenarios as immutable deltas with ancestry | Prevents baseline mutation and preserves alternatives | Requires ancestry resolution and stale-context labels | Complex branching/merging demands a richer scenario graph |
| ADR-007 | No scenario commitment endpoint in MVP | Enforces the approved no-commit scope | Real purchases cannot update context from Ask | Product defines explicit confirmation and real-event semantics |
| ADR-008 | Numeric scenario allowlist contains only one-off current-account purchases | Matches frozen MVP and prevents accidental approximation | General engine types remain unused | A post-MVP decision journey and acceptance suite is approved |
| ADR-009 | Use Supabase for Auth/Postgres and RLS-backed access | Minimum provider count and relational/versioning fit | Vendor-specific auth/data client; RLS complexity | Compliance, region, cost, scale or portability requirements change |
| ADR-010 | Use no ORM initially | Small schema and Supabase JWT/RLS path stay direct; fewer abstractions | Less expressive type-safe query composition | Query complexity or migration friction makes Drizzle materially valuable |
| ADR-011 | Use OpenAI Responses through a replaceable port, initially evaluating GPT-5.6 Luna | Structured outputs/function calls and cost-sensitive fit for narrow tasks | Provider/model behaviour can drift and financial context leaves app boundary | Evals fail, account availability changes, or privacy/cost terms require another provider/model |
| ADR-012 | Use deterministic templates for core results and validated model prose for connective explanation | Exact Sarah acceptance wording and numeric safety | Less generative variation in primary answer | Only if a stronger verifiable generation scheme proves equivalent correctness |
| ADR-013 | Run simulation synchronously; no queue/cache service | Calculation is bounded and user is waiting for an answer | Long provider calls hold the request | Measured latency/timeouts require streaming or asynchronous orchestration |
| ADR-014 | Use six detailed cycles plus explicit configurable goal horizon | Matches MVP while avoiding hidden date extrapolation | Product must choose the maximum before general release | U-01 is resolved or new projection types need different policies |
| ADR-015 | Curated/mock benefit catalog plus incomplete branches only | Proves opportunity discovery without fabricated values/integrations | Benefits cannot show numeric upside in MVP | Eligibility, term and cash-treatment contracts are approved |

## 25. Explicit architectural non-goals

The MVP architecture does not design or scaffold:

- Open Banking, bank feeds or transaction categorisation
- payroll, employer, benefits-platform or document-upload integrations
- multiple participating accounts, multiple currencies or variable income
- recurring-expense, split-payment, instalment, credit-funded or spending-substitution scenarios
- save-first, goal-contribution, safety-target or allocation-priority scenario builders
- scenario commitment/real-transaction ingestion
- numerical season-ticket-loan or benefit uptake
- pension, employer-match, tax, investment, interest or inflation engines
- debt optimisation or autonomous financial recommendations
- autonomous transfers, purchases, applications or other financial actions
- microservices, service mesh, event sourcing, Kafka/event streaming or distributed sagas
- job queues, Redis, vector databases, RAG, large recommendation systems or a data warehouse
- native iOS/Android applications, offline-first synchronisation or push notifications
- large-scale regulatory/compliance claims or enterprise administration
- social/shared goals, Future You Wrapped or general “what should I prioritise?” logic

The architecture keeps clean seams for later work, but it does not build unused abstractions, tables, flags or infrastructure for these items now.

## 26. Golden-path architecture walkthrough

| Step | Component involved | Input | Output | Persisted state | Must remain immutable |
|---|---|---|---|---|---|
| 1. Sarah opens the app | Auth adapter, Home use case, context/scenario repositories | Auth session | Sarah profile, current context `fc_sarah_v1`, B0/current summary, saved thread list | Session refresh only; existing data read | Sarah v1 context and historical runs |
| 2. Current path loads | Baseline use case, simulator or matching run cache | Snapshot £2,750 cash, £1,850 reserve, £900 buffer, £2,450 income, goals/policy; rules/calendar/horizon | B0 with £900 buffer and Dec 2026/May 2027/Jun 2029 goal dates | Matching B0 run may already exist or is inserted | Financial context version; any prior B0 run |
| 3. Sarah asks about the trip | Ask UI, message API | “Can I afford a £650 trip next month?”, request ID, thread ID | Persisted user-message reference; calculating state | User message and idempotency key | B0, context, other threads/scenarios |
| 4. AI interprets | Conversation orchestrator, OpenAI adapter | User text, August 2026 thread snapshot, narrow schema | `simulate_one_off_purchase`: £650 GBP, trip, September 2026 | Model metadata retained when final message is stored | No financial state changes; model cannot write context |
| 5. Request becomes structured | Orchestrator/validator | Interpreted action plus supported conservative assumptions | Validated one-off command: single current-account payment, before payday, additional spending | Scenario definition prepared, not yet visible as evaluated | Sarah's normal £1,850 spending and locked September £600 transfers |
| 6. Baseline and S1 calculate | Pure simulator, scenario use case | B0 snapshot + one £650 September debit + rules/calendar | Event ledger, S1 projection, comparison, classification and manifest | None during pure calculation | B0 events/result and all context values |
| 7. Deterministic result is accepted | Result validator, persistence adapter | Reconciled S1 result | £250 low, bills covered, £0 credit, November recovery, Feb/Jun/Jul goal dates, Significant class | Atomic S1 + simulation run + hashes/versions | B0 and scenario definition inputs |
| 8. AI explains | Explanation adapter and deterministic presenter | Approved fact package/reason codes/ledger references | Validated prose or deterministic fallback plus structured response cards | Assistant message linked to S1/run | Every numeric/result field; class cannot be edited by prose |
| 9. UI renders before/after | Ask reducer and result components | Structured conversation blocks/presentation model | £900 -> £250, £2,750 -> £2,100, goals before/after, assumptions and monthly path | Selected view may become S1 | Baseline and stored result; rendering performs no arithmetic |
| 10. Sarah selects £500 | Existing alternatives use case or selection command | S1 and amount-candidate rule; later scenario selection | S1-A500 (and S1-A400) siblings; £500 shows £400 low/Jan-Jun-Jun/Significant | Independent scenario definitions/runs; selected view points to S1-A500 | B0, S1 and S1-A400 |
| 11. Sarah tries October | Conversation action, timing-alternative use case, simulator | “What if I wait until October?”, source S1 | S1-TOCT with same £650/funding/cost treatment and October month; £250 low, Nov recovery, same goal dates | Independent sibling/run and assistant message | B0, S1, amount siblings; no save-first rule is added |
| 12. Opportunity appears | Benefit catalog adapter and presenter | Optional OniBank association, season-ticket metadata | Secondary card: eligibility unknown, excluded from current calculations | Opportunity view/status may already persist | Every baseline/scenario calculation and benefit state |
| 13. Sarah explores the loan | Orchestrator, benefit-exploration use case | Benefit ID and base S1 | S1-O1 draft plus checklist for eligibility, amount, dates, repayment, fees and replaced expense | Draft child with `needs_information`; no simulation run | B0, S1 and all siblings; benefit remains non-active |
| 14. Numeric simulation is blocked | Scope validator | User request/partial terms | Explicit MVP/incomplete-information message; no numeric result card | Safe assistant message and draft status only | No invented benefit cash flows, savings or class |
| 15. Sarah returns to Current path | Ask selection API/reducer | `{ selection: "current_path" }` | B0 result shown; all what-ifs remain in selector | Thread selection may update to B0 | Sarah context, B0, S1, alternatives and S1-O1 history |

At no step does viewing, explaining or comparing a scenario create a real trip, alter Sarah's cash balance, activate a benefit or rewrite a goal plan.

## 27. Recommended implementation sequence after architecture approval

The numbered sequence below records the original architecture proposal. It no longer names the active
post-Slice-4 order: alternatives/navigation shipped earlier, and the approved replacement Slice 5 is
constrained conversational orchestration plus the real Ask visual experience. Slice 6 applies the visual
system to Home, Goals and Benefits; Slice 7 refines responsiveness, accessibility, interaction and final
cross-screen quality rather than introducing the design for the first time.

Implementation should proceed in vertical slices, with the deterministic golden path visible early.

### Slice 0 — Close architecture gates

- Approve this architecture and record decisions.
- Resolve or explicitly time-box U-01 and U-02 for the demo/release environment.
- Confirm provider account availability/data settings and the demo hosting/database environments.
- Do not change Sarah's numbers to close any gate.

### Slice 1 — Deterministic truth

- Establish strict TypeScript domain foundations: Money, dates, IDs, evidence and errors.
- Add the frozen Sarah fixture and ruleset.
- Implement event generation/order, ledger, buffer, goal allocation/rollover, goal dates, classification and assumptions.
- Translate and pass all 19 Sarah acceptance tests before UI/API work relies on a result.

**Exit:** repeated pure calls reproduce B0 and £650 S1 exactly with no framework, database or LLM.

### Slice 2 — First end-to-end £650 path without LLM

- Scaffold the Next.js shell and visual design tokens from the frozen UI.
- Add application use cases, in-memory repositories and thin typed Route Handlers.
- Wire a development/test typed scenario command through Ask to the deterministic £650 result components.
- Build calculating, result, before/after, monthly path and assumptions states.

This is a development seam, not a new production form or fallback.

**Exit:** a browser test renders the exact golden result from simulator output and proves the UI performs no calculation.

### Slice 3 — Persistence, auth and confirmed context

- Add Supabase Auth, user-owned schema, migrations, RLS and repository adapters.
- Implement immutable context versions, profile pointer, baseline/run cache, decision threads/messages/scenarios and idempotent transactions.
- Seed Sarah per demo user.
- Implement minimum financial onboarding, review/confirmation and optional workplace step.

**Exit:** Sarah can sign in, reload and retain current context/thread/S1; cross-user isolation tests pass.

### Slice 4 — Conversational interface

- Implement the provider-neutral LLM port and fake provider.
- Add OpenAI structured interpretation, supported action validation and thread-memory projection.
- Add deterministic presentation templates, fact-bounded explanations and fallback behaviour.
- Cover canonical, follow-up, unsupported, malformed and provider-failure evals.

**Exit:** Sarah can type the canonical natural-language question and receive the already-verified result; disabling the provider does not break simulator tests or stored results.

### Slice 5 — Alternatives and scenario navigation

- Implement 75%/60% candidate generation and £500/£400 sibling runs.
- Implement the October timing sibling.
- Build comparison cards, viewing pill, scenario sheet, selection and Current-path return.
- Persist each branch and assumption set independently.

**Exit:** all frozen alternative outcomes and isolation checks pass end to end.

### Slice 6 — Supporting product surfaces

- Complete Home with supported decision prompts/current-path preview.
- Complete Goals current path and explicit hypothetical preview.
- Complete Benefits with curated OniBank opportunity data.
- Add S1-O1 Needs information exploration with numeric evaluation disabled.

**Exit:** Home, Ask, Goals and Benefits express one coherent decision-simulation system without budgeting-dashboard drift.

### Slice 7 — Safety and demo hardening

- Finish error states, stale-context handling, retry/idempotency and persistence recovery.
- Add rate limits, redaction, prompt-safety tests, RLS verification and secret review.
- Add structured observability and latency breakdowns.
- Complete Playwright golden path, accessibility, responsive layouts and visual regression checks against the supplied design references.
- Run the evaluator demo from a fresh account/environment and preserve exact rules/build metadata.

**Exit:** every MVP acceptance criterion is demonstrable and failures do not fabricate or silently mutate financial state.

No implementation should begin until this specification is approved. When implementation starts, the first non-document milestone is Slice 1, not infrastructure or LLM integration.
