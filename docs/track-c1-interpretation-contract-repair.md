# Track C1A — Interpretation Contract Repair

Status: locally implemented and verified. No live OpenAI request is authorised or performed by this track. Track C1B requires separate human approval. Track C2 and Phase B2 remain paused.

## Purpose and diagnosis

Track C0 ended with `LIVE_PROVIDER ACCEPTANCE — FAILED`. Terra passed the canonical £650 smoke test, but the frozen repeated baseline passed only 42/105 logical evaluations. Clarifications passed 6/18, follow-ups 9/12, unsupported cases 0/24, adversarial cases 0/24, first-attempt strict/runtime validity 65/105, and final validity after one retry 66/105. Explanation planning passed 6/6 and deterministic containment remained effective.

The v1 interpretation tool exposed one flat object. Every intent shared amount, timing, explanation, selection, unsupported, ambiguity, missing-field and unsupported-feature properties, most of them nullable. The JSON Schema could therefore accept combinations that were structurally valid but semantically impossible. The prompt also omitted exact application-owned identifiers, and the retry repeated an under-specified request.

C1A repairs only the interpretation boundary. The simulator, Sarah data and outcomes, scenario types, explanation contract, server financial renderer, Ask UI/copy, persistence ownership/RLS, provider permissions, data minimisation and product scope are unchanged.

## Version boundary

New turns use:

- Interpretation prompt: `fy-conversation-interpretation/2.0.0`
- Interpretation schema: `fy-conversation-intent/2.0.0`

Pending clarification turns use:

- Clarification prompt: `fy-clarification-resolution-prompt/1.0.0`
- Clarification schema: `fy-clarification-resolution-schema/1.0.0`

The v1 prompt/schema identifiers, v1 runtime shape, v1 provider JSON Schema, original C0 corpus, artifacts, evidence and recovery tag remain available. Stored historical rows are not relabelled. Explanation remains:

- `fy-conversation-explanation/1.0.0`
- `fy-explanation-plan/1.0.0`

## V1 versus v2

| Concern | V1 | V2 |
|---|---|---|
| Provider root | Flat object containing every possible field | Strict object with one required `interpretation` property |
| Alternatives | One kind enum plus nullable shared fields | Nested branch alternatives beneath `interpretation` |
| Missing data | Free-form `missingFields` array | Exact clarification branches |
| Unsupported category | Free-form string | Application-owned exact enum |
| Scenario reference | Nullable label | Exact strategy/selection target plus grounded optional quote |
| Pending clarification | Full intent reinterpretation | Narrow amount, month or scenario-resolution tool contract |
| Invalid-output retry | Repeated original request | One bounded repair with sanitised validation codes |
| Semantic authority | Mainly application checks | Strict structure plus unchanged application checks |

The provider root is deliberately not a root-level `anyOf`. Alternatives exist only under `properties.interpretation.anyOf`. Every object rejects additional properties, every declared property is required, and null is permitted only for genuinely optional values inside a branch.

## Canonical policy vocabulary

`src/application/conversation/interpretation-policy.ts` is the single server-owned source for identifiers, descriptions and presentation mappings.

Intent branches:

- `CREATE_ONE_OFF_PURCHASE`
- `CHANGE_PURCHASE_AMOUNT`
- `CHANGE_PURCHASE_MONTH`
- `EXPLAIN_SELECTED_RESULT`
- `SELECT_EXISTING_SCENARIO`
- `CLARIFY_PURCHASE_AMOUNT`
- `CLARIFY_PURCHASE_MONTH`
- `CLARIFY_SCENARIO_REFERENCE`
- `HELP`
- `GREETING`
- `UNSUPPORTED`
- `AMBIGUOUS`

Clarification identifiers are limited to `PURCHASE_AMOUNT`, `PURCHASE_MONTH` and `SCENARIO_REFERENCE`.

Unsupported categories are:

- `INSTALMENTS`
- `CREDIT_OR_OVERDRAFT_FUNDING`
- `GOAL_SAVINGS_FUNDING`
- `MIXED_FUNDING`
- `SPENDING_SUBSTITUTION`
- `INTRA_MONTH_PAYMENT_TIMING`
- `BENEFIT_SIMULATION_OR_ACTIVATION`
- `PENSION_CONTRIBUTION_CHANGE`
- `SCENARIO_COMMITMENT`
- `RECURRING_EXPENSE_CHANGE`
- `INVESTMENT_OR_TRADING_ADVICE`
- `GENERAL_FINANCIAL_RECOMMENDATION`
- `CROSS_USER_OR_IDENTITY_ACCESS`
- `RESULT_OR_AUTHORITY_OVERRIDE`
- `PROMPT_OR_TOOL_OVERRIDE`
- `SECRET_OR_SYSTEM_PROMPT_REQUEST`
- `OTHER_OUT_OF_SCOPE`

Explanation targets are exact and remain descriptive: `OVERALL_CLASSIFICATION`, `SAFETY_BUFFER`, `BUFFER_RECOVERY`, `GOAL_DELAY`, `BILLS`, `BORROWING`, `ASSUMPTIONS`, `TIMING_EFFECT`, and `OTHER_SUPPORTED_EXPLANATION`.

Scenario reference strategies are `SELECTED_SCENARIO` and `EXPLICIT_SCENARIO_LABEL`. Selection additionally supports `CURRENT_PATH`.

## Decision table

The v2 prompt applies this precedence:

1. Security, authority overrides and unsupported capabilities return exact `UNSUPPORTED`, even when a valid-looking amount is present.
2. Show/open/return/go-back/switch commands select an existing scenario or `CURRENT_PATH`.
3. Why/how/what-changed/what-caused/explain questions explain a stored result.
4. Amount follow-ups require a selected or explicit scenario; otherwise they clarify the scenario reference.
5. Month follow-ups require a selected or explicit scenario; otherwise they clarify the scenario reference.
6. An initial purchase requires a grounded amount and timing. Missing amount and month use their exact clarification branches.
7. Help/greeting applies only when no more specific branch applies.

A small contrastive set covers current-path selection versus explanation, amount follow-up with/without a selected scenario, missing amount/month, instalments, benefit activation, authority override and cross-user access. The production prompt does not contain corpus case IDs or a complete answer key.

## Branch semantics

Supported command branches contain only their usable fields. A create branch cannot exist without amount and timing. Scenario follow-ups declare either the selected scenario strategy or an explicit grounded label. The scenario-clarification branch preserves a nested attempted operation, including only the amount, timing or explanation target needed to resume that operation safely.

The runtime validator additionally rejects:

- Non-GBP supported purchase branches
- Impossible timing field combinations
- An explicit scenario strategy without a quote
- A non-explicit strategy with an invented quote
- An explicit selection target without a quote
- Cross-branch extra fields
- Unknown identifiers

Strict provider output is not an authorised application command. The application still verifies state, source grounding, context currency, scenario ownership/reference and the unchanged product boundary before invoking any simulator use case.

## Clarification resolution

When a pending gap exists, the application calls `resolveClarification`, not the full interpretation method.

- Amount pending: `RESOLVE_PURCHASE_AMOUNT`, exact `UNSUPPORTED`, or exact `AMBIGUOUS`
- Month pending: `RESOLVE_PURCHASE_MONTH`, exact `UNSUPPORTED`, or exact `AMBIGUOUS`
- Scenario pending: `RESOLVE_SCENARIO_REFERENCE`, exact `UNSUPPORTED`, or exact `AMBIGUOUS`

The pending operation remains application-owned. A clarification answer cannot turn the original request into a different financial capability. Unsupported or repeatedly ambiguous answers create no simulation and retain the pending gap safely. Clarification turns store the exact clarification prompt/schema versions in the existing turn-version columns; no persistence schema or RLS policy changed.

## Source grounding and deterministic authority

- The model returns an exact amount quote, never pence. The server confirms the quote exists in the current answer or the specifically preserved prior request, then applies the existing exact GBP parser.
- A new timing quote must occur in the current answer or the preserved prior request. The model returns semantic timing only. The server uses the trusted timestamp, `Europe/London`, selected scenario period and existing calendar rules.
- An explicit scenario label must occur in the current message. Otherwise only the server-declared selected scenario can be used. Provider-supplied scenario/run/user IDs are never accepted.
- Word-only money remains ambiguous.

These rules did not change the money parser, date resolver or simulator authority.

## Bounded repair

The OpenAI adapter permits at most one invalid-output repair when configured with the existing one-retry policy. The second request uses the same model, reasoning setting, prompt, strict schema, forced function, timeout and output limit. It contains only:

- Original user message
- Symbolic pending/selected state and user-facing scenario labels
- Invalid structured output
- Sanitised machine-readable validation paths/codes
- Exact permitted identifiers

It excludes financial context, balances, income, goals, employer data, simulator output, expected corpus answers, secrets and full conversation history. A second invalid output returns the existing typed interpretation failure. Repair never invokes the simulator or creates another message/run; turn idempotency remains application-owned.

## Provider request policy

All provider methods retain:

- Responses API
- One forced strict function
- `strict: true`
- `additionalProperties: false`
- `parallel_tool_calls: false`
- `store: false`
- No built-in tools
- No provider Conversation or authoritative `previous_response_id`
- Runtime validation after the SDK response
- Server-owned state and data minimisation

The explanation function and symbolic trusted-fact plan are unchanged.

## Evaluation corpus

The original 33 interpretation cases plus two explanation probes remain the frozen 35-case C0 comparison set. The v2 corpus retains all 33 original messages and adds genuine coverage gaps: contrastive current-path commands/explanations, pending resolution, repeated ambiguity, exact category coverage, mixed valid/unsupported requests and additional authority attacks.

The expanded v2 set has 48 interpretation/clarification cases plus the unchanged two explanation probes. Each case records branch, exact identifier, grounding expectation, simulator permission, selected-scenario state and pending-clarification state. Production routing contains no case-ID or exact-message answer patches.

## Local operation

- Contract/corpus: `npm run test:evaluation`
- Repeated fake harness: `npm run test:evaluation:harness -- --repetitions=3`
- Unit/regression: `npm test`
- Disabled readiness only: `npm run openai:readiness`

Do not run `npm run test:evaluation:live` during C1A.

## Proposed C1B plan — not authorised

After separate human approval:

1. Keep provider disabled and run readiness/secret/schema inspection.
2. Enable Terra with `gpt-5.6-terra` and `OPENAI_REASONING_EFFORT=low`.
3. Run schema-access smoke, canonical £650 smoke, then one case from each repaired category.
4. If all mandatory gates pass, run the original frozen set three times and the expanded v2 set once.
5. Disable provider.
6. Run Luna only if Terra passes every mandatory gate, under identical contracts and evaluation rules.
7. Use Sol only for separately justified diagnostics.
8. Disable provider and report honestly.

Mandatory gates remain 100% canonical, schema validity, grounding, unsupported/adversarial, clarification, canonical follow-up and current-path selection; zero unauthorised simulator calls and zero financial-authority violations.

A prudent proposed cumulative guard is **US$5**, with the expected token-derived cost likely below that based on the C0 Terra run. This is an estimate/guard, not an invoice and not an authorisation. The exact C1B budget and permission must be granted separately.

## Deferred work

Track C2 retains the observations about distinct interpreting/calculating states, mechanical repetition, fallback wording, long-message editing, mobile keyboard behaviour and clearer AI-versus-simulator communication. No UI or copy change is part of C1A. Phase B2 remains paused.
