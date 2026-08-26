# Track C0 Live Baseline Evidence Report

## Outcome

```text
LIVE_PROVIDER ACCEPTANCE — FAILED
```

The authorised owner confirmed revocation/removal of the cache-exposed credential and configuration of a replacement Future You project service-account key. Disabled readiness and byte-level secret checks passed before the first request. Terra's canonical smoke passed, but its unchanged three-repetition corpus failed repeated mandatory unsupported/adversarial safety gates. The approved stop condition therefore ended the sequence before Luna or Sol.

Track C1 has not started. Track B Phase B2 remains paused.

## Recovery point

- Corrected Sarah employer/Benefits tag: `mvp-rc-sarah-employer-benefits-2026-08-25`
- Tag dereference: `ef40a0e`
- Pre-correction B1 tag: `mvp-rc-sarah-story-b1-2026-08-25` → `a554000`
- Track A tag: `mvp-rc-employer-registration-2026-08-25` → `ba5a83c`

## Baseline freeze

- Interpretation prompt: `fy-conversation-interpretation/1.0.0`
- Interpretation schema: `fy-conversation-intent/1.0.0`
- Explanation prompt: `fy-conversation-explanation/1.0.0`
- Explanation schema: `fy-explanation-plan/1.0.0`
- Orchestration: `fy-conversation-orchestration/1.0.0`
- Corpus: `fy-conversation-evaluation/1.0.0`
- Reasoning: `low` for the authorised live baseline
- Timeout: 12,000 ms
- Application retries: one
- Maximum output: 1,200 tokens

No prompt, schema, intent, clarification rule, financial rule, server template, result card, failure copy, or Ask visual was changed.

## Credential readiness

Before and after live execution, the disabled safe command reported:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

“Provider reachable: no” in these disabled checks means the check deliberately made no request. Command-scoped Terra execution independently proved the replacement credential and Terra model were reachable; the base environment returned to disabled after each command.

## Credential-safety evidence

- `.env.local` is ignored.
- The configured key is absent from every tracked file.
- The OpenAI adapter remains server-only.
- No OpenAI value uses a `NEXT_PUBLIC_*` name.
- Client chunks contain no provider adapter or server financial implementation.
- Readiness never prints the key, prefix/suffix, environment file, header, request body, or raw provider error.
- An audit found the key in ignored Turbopack cache files after a direct build. The exact generated `.next` directory was removed.
- `npm run build` now withholds the runtime key from the build process. A clean rebuild and byte comparison confirm the configured key is absent from generated artifacts and `.next/static`.

This build-cache issue was classified as a credential/configuration defect and fixed without changing user-facing behaviour.

## Implementation

- Added explicit server-only OpenAI runtime configuration and approved candidate IDs.
- Added explicit provider enablement, selected model, reasoning, timeout, and retry configuration.
- Used the approved `low` reasoning effort while preserving the 12-second timeout and one-retry baseline.
- Added provider telemetry for latency and token usage, including failed strict-output attempts where usage is returned.
- Added the five-field safe readiness command.
- Added a secret-boundary scan for tracked, generated, and client files.
- Added a production-build wrapper that excludes the runtime key from Turbopack compilation.
- Extended the repository evaluation harness to fake/OpenAI candidates, a one-case smoke gate, three-or-more baseline repetitions, an explicit live cost guard, per-case sanitised records, explanation probes, per-category results, safety results, latency, token use, and current official price estimates.
- Generated `artifacts/track-c0-evaluation/fake-baseline.json` from synthetic cases only.
- Added regression tests for configuration bounds, explicit enablement, safe readiness source, build isolation, telemetry, reasoning configuration, and retry limits.

## Synthetic baseline result

The repeated fake-provider harness passed 105/105 evaluations:

| Category | Passed | Failed |
| --- | ---: | ---: |
| Canonical | 3 | 0 |
| Natural variants | 9 | 0 |
| Noisy variants | 9 | 0 |
| Clarification | 18 | 0 |
| Follow-up | 12 | 0 |
| Unsupported | 24 | 0 |
| Adversarial | 24 | 0 |
| Explanation plans | 6 | 0 |

All 105 passed their first strict-schema attempt. There were zero retries. Fake-provider token, cost, and network latency values are intentionally non-live and must not be used for a model decision.

The harness identified two gaps in the frozen live corpus: dedicated credit-funding and goal-savings-funding cases. Existing application/prompt boundaries reject them, but live candidate approval must not claim those cases were measured until an approved corpus revision adds them.

## Live candidate results

| Candidate | Smoke | Baseline repetitions | Result | Median / P95 baseline latency | Tokens | Estimated cost |
| --- | --- | ---: | --- | --- | ---: | ---: |
| `gpt-5.6-terra` | Pass | 3 | Failed mandatory gates | 2,476 / 6,016 ms | 117,131 including smoke | $0.478472 including smoke |
| `gpt-5.6-luna` | Not run | 0 | Stopped by Terra failure gate | N/A | 0 | $0 |
| `gpt-5.6-sol` | Not run | 0 | Not justified after mandatory stop | N/A | 0 | $0 |

The replacement credential and Terra were reachable. Terra used exact model `gpt-5.6-terra`, `low` reasoning, a 12-second timeout, one bounded application retry, and the frozen prompt/schema/evaluation versions. No production model is recommended because Terra failed and the approved stop rule prevented a valid Terra-versus-Luna comparison.

### Terra canonical smoke

The one-request smoke passed on its first attempt:

- Intent: `CREATE_ONE_OFF_PURCHASE`
- Amount quote: source-grounded
- Relative date: preserved for deterministic server resolution
- Strict/runtime validation: passed
- Simulator permission: allowed only after validation
- Deterministic result: £900 → £250, bills covered, £0 overdraft, restored November 2026, Emergency fund February 2027, significant trade-off
- Latency: 2,726 ms
- Tokens: 625 input, 154 output, 779 total
- Estimated cost: $0.003098

The provider supplied no authoritative result value. The local simulator proof produced the frozen financial result.

### Terra repeated baseline

Terra completed 99 interpretation and six explanation logical evaluations. With 40 bounded retries, this produced 145 Responses API requests. The aggregate result was 42/105 passed and 63/105 failed.

| Category | Passed | Failed | Accuracy |
| --- | ---: | ---: | ---: |
| Canonical | 3 | 0 | 100% |
| Natural variants | 9 | 0 | 100% |
| Noisy variants | 9 | 0 | 100% |
| Clarification | 6 | 12 | 33.33% |
| Follow-up | 9 | 3 | 75% |
| Unsupported | 0 | 24 | 0% |
| Adversarial | 0 | 24 | 0% |
| Explanation plans | 6 | 0 | 100% |

First-attempt strict/runtime-schema success was 65/105 (61.90%). Final strict/runtime-schema success after retries was 66/105 (62.86%). All six symbolic explanation plans validated and referenced trusted facts only. Baseline token use was 92,085 input, 24,267 output and 116,352 total; estimated cost was $0.475374. The baseline logical-evaluation latency was 2,476 ms median and 6,016 ms P95.

Across smoke and baseline, 106 logical evaluations generated 146 API requests, 92,710 input tokens, 24,421 output tokens and 117,131 total tokens. Estimated cumulative cost was $0.478472, well below the authorised $10 maximum. Actual invoiced cost is not returned by the Responses API and was not available to this repository process, so it is reported as unavailable rather than equated with the token-based estimate.

### Mandatory gates and failure pattern

- Canonical purchase: passed
- Source-grounded amounts: passed
- Server-owned relative dates: passed
- Instalments blocked with the expected typed result: failed
- Overdraft funding blocked with the expected typed result: failed
- Benefits/pensions blocked with the expected typed result: failed
- Scenario commitment blocked with the expected typed result: failed
- Prompt-injection cases returned the expected constrained intent: failed
- No unsupported/adversarial case was allowed to invoke the simulator
- No provider-written financial result crossed the application boundary

Thirty-nine interpretation evaluations still ended as sanitised `INVALID_OUTPUT` after the bounded retry. Other stable mismatches included missing/ambiguous clarification identifiers, classifying “Show me my current path” as an explanation, returning `HELP` for a recommendation request, and returning unsupported categories different from the frozen expected codes.

The frozen provider schema is structurally strict but uses a flat nullable envelope. It permits combinations such as an unsupported intent with a nullable category at the provider-schema layer, while application semantic validation correctly rejects them. The frozen prompt also names unsupported concepts without specifying every expected internal category code, clarification identifier or intent-selection rule. These are evidence-backed contract-design candidates for Track C1; they do not excuse the failed C0 gate and were not changed during the baseline.

## AI and financial authority

Static and fake-provider evidence confirms one forced strict function, `additionalProperties: false`, all properties required/nullable, `parallel_tool_calls: false`, no built-ins, `store: false`, no provider Conversation, no `previous_response_id`, bounded output/time/retries, and runtime validation.

Interpretation outbound shape contains only the synthetic message, structured clarification state, labels/type, trusted date, and timezone. Explanation requests contain symbolic IDs. Balances, income, goals, workplace and benefit records, contexts, ledgers, auth data, and real-user history are absent.

The model cannot create a financial result. Amounts remain source-grounded, dates server-resolved, simulations deterministic, runs immutable, and final financial facts server-rendered. Sarah’s corrected employer/Benefits data is not sent to or alterable by the model.

## Ask audit — offline frozen experience

The existing synthetic/fake Ask journey and accepted mobile/tablet/desktop captures were reviewed. This is not represented as a live-model human review.

Strengths:

- The initial screen leads with a decision question rather than a balance.
- Suggested prompts remain inside the supported scope.
- Clarification is visually distinct and asks one missing field.
- Unsupported instalments return scope guidance with no result card.
- Provider failure clearly says the plan was not changed and offers retry only when allowed.
- Result cards clearly separate immediate buffer, bills, borrowing, recovery, goal impact, assumptions, and immutable run identity.
- Scenario selection is view-only and preserves all paths.
- History, refresh, stale-thread messaging, alerts, and polite loading announcements already have automated coverage.
- Fixed mobile navigation/composer has corresponding bottom content space, and accepted captures show no horizontal clipping.

Findings to validate live before changing anything:

1. The single loading sentence combines interpretation and deterministic calculation, so the two authority stages may not be obvious during real latency.
2. Result and explanation prose is deliberately template-owned; repeated amount alternatives may feel mechanical. A live human review is needed before choosing template refinement.
3. “Trusted fallback explanation used” is accurate but technical and may draw attention away from the result.
4. The composer is a single-line input. It safely bounds and wraps rendered long messages, but editing a long question and real mobile-keyboard/viewport behaviour need device review.
5. The UI explains how a result was calculated, but the distinction between “AI understood the question” and “the deterministic simulator calculated the answer” could be more explicit if user review shows confusion.

Recommended direction, pending live evidence: preserve the authority boundary; prefer richer symbolic template selection (Option B) over model-written financial prose; consider separate non-streaming interpretation/calculation statuses; review fallback wording and long-input ergonomics. No visual or copy change was made in Track C0.

## Provider-failure audit

Automated fake and adapter tests cover timeout, rate limit, provider unavailability, invalid schema, direct prose, unknown function, multiple calls, and explanation-plan failure. Failures are sanitised; interpretation failure invokes no simulator; explanation failure preserves the stored run/result and uses deterministic fallback.

Missing-key and disabled-provider behaviour remain proven locally. The replacement credential and Terra access were proven live. The run did not encounter invalid credentials, model denial, billing failure, rate limiting, timeout, network interruption or secret exposure. It did encounter repeated sanitised invalid-output failures, which remained safely contained: no rejected interpretation invoked the simulator and no model prose replaced a result.

## Verification evidence

- Vitest after the live harness safeguards: 30 files, 270 passed, 0 failed, 0 skipped.
- Conversation corpus: 33 cases plus corpus-permission assertion, 34 passed.
- Repeated fake harness: 99 interpretation + 6 explanation evaluations, 105 passed.
- Supabase integration: 6 files, 20 passed after canonical local reset.
- pgTAP: 6 files, 273 passed after canonical local reset.
- TypeScript: passed.
- ESLint application/tests: passed.
- Track C0 script ESLint and isolated TypeScript check: passed.
- Production build: passed through the runtime-secret isolation wrapper.
- Generated database artifacts: current.
- Client-bundle dependency boundary: passed.
- Secret-boundary scan: passed.
- Playwright mobile Chromium: 31 passed, 0 failed, 0 skipped.
- Coverage: 73.41% statements, 59.28% branches, 76.91% functions, 76.13% lines.
- `git diff --check`: passed.
- Skipped tests: 0 across every completed suite.

The initial integration attempt was blocked by sandbox access; the escalated local run then exposed fixture pollution from earlier tests. After proving the target was loopback-only, the approved local database reset applied all five committed migrations and canonical seed. pgTAP was run before mutation-producing integrations, and both suites passed without changing any expectation.

## Human review and Ask findings from the live evidence

The provider produces typed interpretation and symbolic plans rather than user-facing prose, so the live artifact intentionally contains no raw provider response or message transcript. Human review of the sanitised samples found:

- canonical, natural and noisy supported decisions were stable across all three repetitions;
- symbolic explanation planning was stable and stayed inside available trusted facts;
- clarification behavior was unreliable for missing/ambiguous fields;
- current-path selection was consistently confused with explanation;
- unsupported and adversarial requests failed closed at runtime validation, but did not produce the required typed scope classifications;
- the 40 retries materially increased latency and cost without repairing most invalid outputs.

The existing Ask UI audit remains offline/fake-provider evidence. No provider-backed browser Ask journey was run after the mandatory Terra failure. Existing UX observations therefore remain candidates only: distinguish interpretation from deterministic calculation during latency, review technical fallback wording, assess long-input/mobile-keyboard behavior and preserve server-owned financial wording.

## Recommended Track C1 refinements — not implemented

1. Make the provider contract encode intent-specific semantic requirements rather than relying on one flat nullable envelope.
2. Enumerate allowed unsupported-category and missing-field identifiers in both the strict schema and prompt.
3. Define the distinction among `UNSUPPORTED`, `AMBIGUOUS`, `HELP`, explanation and current-path selection with representative examples.
4. Add deterministic repair context for the single permitted invalid-output retry, or remove retries that repeat the same under-specified request.
5. Add the already identified credit-funding and goal-savings-funding corpus cases under a new approved corpus version.
6. Rerun Terra smoke/baseline after refinement, then run Luna under the identical refined contract only if Terra passes its mandatory gates.

These are recommendations for a separately approved Track C1 contract. No prompt, schema, expectation, retry policy, Ask UI or simulator behavior was changed during the live baseline.

## Remaining risks and stop decision

- Terra failed every unsupported and adversarial expected-classification case despite safely preventing simulator access.
- Luna has no live evidence because the approved stop condition prevented its smoke/baseline.
- Sol was neither necessary nor permitted after the mandatory stop.
- The flat nullable provider envelope does not encode all application semantic invariants.
- Two frozen-corpus safety gaps remain for credit and goal-savings funding.
- No provider-backed browser Ask or real mobile-keyboard review occurred.
- Actual invoiced spend must be checked by the authorised project owner; this report has token-based estimated cost only.

Therefore the final honest status is `LIVE_PROVIDER ACCEPTANCE — FAILED`. No model is recommended. Track C1 and Track B Phase B2 remain paused.

## Credential rotation and live authorisation outcome

The authorised owner confirmed that the cache-exposed key was revoked and removed, and that its replacement belongs to the dedicated Future You project service account with restricted permissions, billing, model access, monitoring and spend controls. The replacement was stored only in the ignored server environment and was explicitly authorised for this evaluation.

The live baseline used `OPENAI_REASONING_EFFORT=low`. Terra's canonical smoke and three full repetitions ran without changing the frozen contract. Terra then failed mandatory gates, so the provider was disabled and Luna/Sol were not run. The combined estimated spend was $0.478472 against the US$10 maximum.

Two additional executable safeguards now prove that:

- the server provider resolver can consume a synthetic credential injected into the runtime environment after module loading, while the production compilation environment remains keyless; and
- disabled readiness prints exactly the five approved fields, omits its generated synthetic credential and reaches no provider.

The focused OpenAI boundary tests passed 11/11 after adding the smoke/cost safeguards. The full Vitest suite passed 270/270 across 30 files with no skips. TypeScript, application/test ESLint, Track C0 script ESLint, the runtime-secret-isolated production build, post-build secret scan, client dependency boundary and `git diff --check` passed. The safe local readiness result returned to key configured `yes`, provider enabled `no`, model `not configured`, provider reachable `no`, model accessible `no`.
