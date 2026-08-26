# Track C1C Local Evidence Report

Date: 26 August 2026

Final status: **C1C LOCAL SANITISED DIAGNOSTICS — COMPLETE**

Live OpenAI requests during C1C: **0**

Provider state after verification: **disabled**

Model selection after verification: **unset**

Track C2: **PAUSED**

Track B Phase B2: **PAUSED**

## 1. Outcome

C1C adds a server-only, evaluation-only observer that identifies the precise stage and closed failure code for an interpretation attempt without retaining the provider output or any user/provider free text. The public application failure remains sanitised, the frozen v2 interpretation contract is unchanged, and no diagnostic can authorise a simulator operation.

The implementation satisfies the local completion gate. A live Terra diagnostic smoke was not authorised and was not run.

## 2. C1B failure and terminology correction

The accepted C1B evidence remains:

```text
Logical cases: 1
Provider requests: 2
Runtime-valid interpretations: 0/1
Result: INVALID_OUTPUT
Simulator calls: 0
Input tokens: 4,688
Output tokens: 230
Estimated spend: US$0.012136
Luna requests: 0
Sol requests: 0
```

The correction appended to `track-c1b-live-evidence-report.md` records:

```text
Provider/model/schema compatibility: Passed
Application-valid interpretation gate: Failed
Precise application validation code: Not captured in C1B
Reason: Raw provider output was intentionally not retained and sanitised validation-stage diagnostics had not yet been implemented
```

The original C1B artifact, `artifacts/track-c1b-evaluation/terra-schema-access.json`, has no working-tree difference and was not rewritten. No missing C1B diagnostic code was inferred retroactively.

## 3. Recovery point

Annotated tag:

```text
track-c1b-terra-v2-invalid-output-2026-08-26
```

Dereferenced commit:

```text
96ee26994aeb35fb8c3471b2f8c5c0dfeedb1f23
```

The existing C0 and C1A tags remain unchanged. All earlier recovery points remain available.

## 4. Implementation

### Added

- `src/infrastructure/ai/openai/interpretation-diagnostics.ts`
- `tests/interpretation-diagnostics.test.ts`
- `docs/track-c1c-sanitised-interpretation-diagnostics.md`
- `docs/track-c1c-local-evidence-report.md`

### Updated

- `.env.example`
- `docs/track-c1b-live-evidence-report.md`
- `scripts/run-live-conversation-evaluation.ts`
- `src/infrastructure/ai/fake-conversation-model-provider.ts`
- `src/infrastructure/ai/openai/openai-responses-conversation-provider.ts`
- `docs/future-you-evolution-details.md`

No migration, database schema, seed, financial context, simulator, renderer, browser, prompt, provider schema or evaluation-expectation file changed.

## 5. Diagnostic taxonomy

Diagnostic contract:

```text
fy-interpretation-diagnostic/1.0.0
```

The implementation defines 13 stable stages:

```text
PROVIDER_RESPONSE_RECEIVED
TOOL_CALL_SELECTION
TOOL_ARGUMENT_JSON_PARSE
STRICT_SCHEMA_VALIDATION
BRANCH_DISCRIMINATOR_VALIDATION
BRANCH_SEMANTIC_VALIDATION
IDENTIFIER_VALIDATION
SOURCE_GROUNDING
CONVERSATION_STATE_VALIDATION
APPLICATION_COMMAND_AUTHORIZATION
REPAIR_REQUEST
REPAIR_RESPONSE_VALIDATION
FINAL_FAILURE
```

It defines 33 closed diagnostic codes across tool selection, JSON parsing, strict shape, identifiers, semantic constraints, source grounding, application authorisation and repair exhaustion. Tests prove the stage/code inventories are unique and that every declared code can be produced by a deterministic fake attempt.

## 6. Sanitised artifact shape

The record contains only:

- a safe synthetic case ID;
- model, prompt, schema and diagnostic version identifiers;
- attempt and repair metadata;
- expected/missing/unexpected/multiple tool status;
- an approved branch enum, `UNKNOWN`, or `null`;
- allowlisted field names;
- safe JSON-pointer paths;
- closed stage and diagnostic identifiers;
- boolean validation/authorisation outcomes; and
- the constant `simulatorInvoked: false`.

Unknown branch strings and unknown property names are discarded. JSON-pointer construction stops at the first unapproved path segment. No free-text fingerprint is created.

## 7. Data deliberately excluded

Automated artifact tests prove the diagnostic JSON contains none of:

- the original user message;
- raw tool arguments or raw provider output;
- amount, timing, purpose or scenario-label values;
- work or personal email;
- Company ID;
- cash balances, goals or financial context;
- API-key bytes or an Authorization header;
- prompt or hidden-instruction text;
- provider prose or reasoning;
- message IDs, run IDs or arbitrary unknown property values.

Raw response data remains transient process memory used only for the existing parse, runtime validation and bounded repair path.

## 8. Evaluation-only gating

Diagnostics require both:

```text
OPENAI_EVALUATION_DIAGNOSTICS_ENABLED=true
```

and explicit construction of the server-only diagnostic collector by the evaluation harness. The variable defaults to `false`, is not browser-prefixed, is not accepted from a request and is not read by ordinary application routes.

The harness omits the diagnostic section entirely when the gate is disabled. The diagnostics do not alter provider input, schema, parsing decisions, application validation or retry count.

## 9. Repair integration

The repair remains limited to one attempt using the same model and frozen v2 schema. The existing repair input now receives only closed diagnostic codes and safe JSON-pointer paths for validation errors.

The observer distinguishes requested, succeeded, identical failure, new failure and exhausted repair outcomes. Tests prove a maximum of two provider calls, no expected evaluation answer or corpus definition in repair input, and no simulator authority. Provider-level fake attempts do not create conversation messages, scenarios or runs; the existing orchestration/idempotency regressions remain green.

## 10. Fake-provider coverage

Thirty deterministic low-level modes cover:

- missing, wrong and multiple tool calls;
- invalid JSON;
- invalid or missing root/branch data;
- missing, null, mistyped, forbidden and extra fields;
- unknown or incompatible identifiers;
- supported-intent semantic failures;
- explanation, selection and clarification incompatibility;
- wrong conversation state;
- ungrounded or unparseable amount/timing/scenario labels;
- invented scenario IDs;
- unresolved/cross-user references;
- unsupported operations carrying command data; and
- successful, identical-failure, different-failure and exhausted repair paths.

Synthetic schema-valid cases exercise likely live failure classes without claiming to reproduce the unknown C1B output.

## 11. Local regression evidence

All final authoritative runs used `OPENAI_API_KEY` removed from the process, `OPENAI_PROVIDER_ENABLED=false` and no selected model where provider configuration was relevant.

| Gate | Discovered | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Focused diagnostic/provider tests | 42 | 42 | 0 | 0 | Pass |
| Focused interpretation/orchestration/corpus tests | 139 | 139 | 0 | 0 | Pass |
| Full Vitest regression | 380 | 380 | 0 | 0 | Pass |
| Repeated fake interpretation/clarification | 144 | 144 | 0 | 0 | Pass |
| Repeated fake explanation plans | 6 | 6 | 0 | 0 | Pass |
| Supabase integration | 20 | 20 | 0 | 0 | Pass |
| PostgreSQL/pgTAP | 273 | 273 | 0 | 0 | Pass |
| Mobile Chromium Playwright | 31 | 31 | 0 | 0 | Pass |

Repeated fake category gates passed canonical 3/3, natural 9/9, noisy 9/9, clarification 30/30, follow-up 21/21, unsupported 42/42 and adversarial 30/30. Every simulator-safety gate remained true.

Coverage from the full 380-test run:

| Metric | Coverage | Covered/total |
| --- | ---: | ---: |
| Statements | 76.13% | 2,466/3,239 |
| Branches | 63.09% | 1,641/2,601 |
| Functions | 79.42% | 525/661 |
| Lines | 78.57% | 2,267/2,885 |

Additional gates:

- TypeScript: pass, zero errors.
- ESLint: pass, zero errors.
- Keyless Next.js production build: pass, 22/22 static-page generation steps completed.
- Generated Supabase types and seed drift: pass/current.
- Client bundle: no server-only simulator/store identifiers.
- Secret boundary: secret file ignored; configured key absent from tracked files, repository files, generated artifacts and client chunks.
- Disabled readiness: key not configured, provider disabled, model not configured, provider unreachable, model inaccessible; no request made.
- C1B artifact integrity: unchanged.
- Visual baselines: no approved changes; verification-generated PNG rewrites were restored.
- `git diff --check`: pass after documentation/history completion.

### Clean-state notes

An initial Supabase integration run encountered existing local test pollution: 18/20 passed and two fixture-state assertions failed. A verified loopback-only local reset reapplied all five committed migrations and canonical seed; the final integration run passed 20/20.

Running pgTAP immediately after the mutation-producing integration suite exposed the same test-order pollution. A second verified local reset restored the seed and the final pgTAP run passed 273/273.

The first complete Playwright run passed. A duplicate concise rerun then found Alex mutated by that completed run; it was stopped after 5 passes, one fixture-state failure and one interrupted test. A verified local reset restored the canonical seed, and the final clean-state concise run passed 31/31. These were environment/fixture-lifecycle effects, not changes made to obtain a product pass. No manual SQL or dashboard action was used.

No prior expectation, frozen Sarah value, simulator result, RLS rule, authority boundary or test assertion was weakened.

## 12. No-live-request proof

C1C made zero OpenAI Responses API calls. The fake harness supplied all provider responses locally. Live cost is US$0. Provider readiness was checked only in disabled/keyless mode.

Provider state at completion:

```text
Key configured: no
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

## 13. Proposed one-case diagnostic smoke — separate approval required

The recommended next action is exactly one Terra diagnostic smoke, not a corpus:

```text
Model: gpt-5.6-terra
Reasoning effort: low
Case: Can I afford a £650 trip next month?
Initial provider requests: 1
Permitted repair requests: at most 1
Maximum estimated spend: US$0.10
Diagnostic mode: enabled only in the evaluation process
```

Capture only the sanitised stage/code/path/approved-shape metadata, repair outcome, token use, latency and estimated cost. If the case passes or fails, stop and report. Do not change the prompt or schema and do not continue to a corpus.

This smoke is **not authorised** by C1C and was not performed.

## 14. Remaining limits and recommendation

C1C cannot determine the historical C1B failure code because preserving raw-output non-retention was an explicit requirement. Only a new, separately authorised diagnostic attempt can observe a future provider response through the safe observer.

Recommendation: approve at most the one-case US$0.10 Terra diagnostic smoke described above. Keep Track C2 and Phase B2 paused until that evidence is reviewed.

## 15. Roadmap status

```text
Track C0:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED

Track C1A:
Complete — locally ready contract v2

Track C1B:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED at first interpretation gate

Track C1C:
Complete — local sanitised diagnostics; live diagnostic not run

Track C2:
Paused

Phase B2:
Paused
```
