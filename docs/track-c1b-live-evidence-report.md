# Track C1B Live Re-evaluation Evidence Report

Date: 26 August 2026

Final status: **LIVE_PROVIDER ACCEPTANCE — FAILED**

Track C2: **NOT STARTED**

Track B Phase B2: **PAUSED**

## Accepted terminology clarification

The original sanitised artifact and the evidence below remain unchanged. Where the original report labels the stopped run as a failed “schema-access” gate, read that label as the **first live interpretation and application-validation gate**. The provider did not reject the schema.

```text
Model accessible: Yes
Provider schema accepted: Yes
Forced function accepted: Yes
Provider response received: Yes
Application-valid interpretation: No
Repair application-valid interpretation: No
Simulator invoked: No
Financial-authority violation: No
```

Provider/model/schema compatibility therefore passed. The application-valid interpretation gate failed. C1B did not capture a precise internal application-validation code because raw provider output was intentionally not retained and sanitised validation-stage diagnostics had not yet been implemented. No missing code is inferred retroactively.

## Executive outcome

The authorised C1B sequence stopped at its first live mandatory gate. The OpenAI Responses API accepted the `gpt-5.6-terra` request, model, forced v2 function and nested strict schema, but Terra did not return a runtime-valid canonical interpretation on either the first attempt or the one permitted repair attempt. The harness reported the sanitised failure category `INVALID_OUTPUT`.

No canonical behavioural smoke, repaired-category sample, frozen-corpus repetition, expanded-corpus run, Luna request or Sol diagnostic followed. No interpretation was accepted, no simulator operation was authorised, no deterministic result was created or changed, and no financial claim was fabricated.

## Authorisation and recovery boundary

The human owner confirmed before the run that:

- the key previously found in an ignored `.next` cache had been revoked;
- the revoked key had been removed from `.env.local` and the ordinary local shell;
- the replacement key belongs to the authorised Future You OpenAI Platform project and its dedicated service account;
- the replacement is non-personal, stored outside the repository and supplied through the approved runtime secret mechanism;
- Next.js development and build processes do not receive the replacement key;
- billing, model access, monitoring and spend controls are configured; and
- C1B has a cumulative estimated-provider-spend ceiling of US$5.

The committed C1A state remains recoverable through annotated tag `track-c1a-local-ready-2026-08-26` at commit `26bcf99`. The earlier failed C0 baseline remains recoverable through `track-c0-terra-failed-baseline-2026-08-26` at commit `61c22df`.

## Frozen provider contract

No prompt, schema, validator, repair, expectation, renderer, UI, simulator or supported-scope change was made during C1B.

| Item | Frozen value |
| --- | --- |
| Interpretation prompt | `fy-conversation-interpretation/2.0.0` |
| Interpretation schema | `fy-conversation-intent/2.0.0` |
| Clarification prompt | `fy-clarification-resolution-prompt/1.0.0` |
| Clarification schema | `fy-clarification-resolution-schema/1.0.0` |
| Explanation prompt | `fy-conversation-explanation/1.0.0` |
| Explanation schema | `fy-explanation-plan/1.0.0` |
| Model attempted | `gpt-5.6-terra` |
| Reasoning effort | `low` |
| Timeout | 12 seconds |
| Application repair | At most one attempt |
| Provider storage | `store: false` |
| Function selection | One forced strict function |
| Parallel calls | `parallel_tool_calls: false` |
| Built-in tools | None supplied |
| Conversation state | Future You-owned; no provider thread |
| Trusted date | 24 August 2026 |
| Timezone | `Europe/London` |

Official OpenAI model documentation available on the run date lists Terra as supporting the Responses API, function calling, structured outputs and `low` reasoning effort: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>.

## Pre-live safety gates

Disabled readiness output was limited to the five approved fields:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

The disabled check made no provider request.

Pre-live boundary results:

- `.env.local` contained no configured `OPENAI_API_KEY` value.
- The configured replacement-key bytes were absent from tracked files.
- They were absent from non-ignored repository files.
- They were absent from `.next` generated artifacts.
- They were absent from client bundles.
- `.env.local` remained ignored.
- Built client chunks contained no server-only simulator or store identifiers.
- No Next.js development or production server was running.

The replacement key was not printed, logged, written to the repository or passed to a Next.js build/development process.

## Live run order and stop decision

| Approved gate | Status | Evidence |
| --- | --- | --- |
| Terra schema-access smoke | **FAIL** | API/model/tool/schema request was accepted, but final runtime interpretation remained invalid after one repair |
| Terra canonical £650 behavioural smoke | NOT RUN | Mandatory stop after schema-access failure |
| Terra repaired-category sample | NOT RUN | Mandatory stop after schema-access failure |
| Terra frozen C0 corpus ×3 | NOT RUN | Mandatory stop after schema-access failure |
| Terra expanded v2 corpus | NOT RUN | Mandatory stop after schema-access failure |
| Luna schema/canonical/corpora | NOT RUN | Terra did not pass every mandatory gate |
| Sol diagnostics | NOT RUN | No approved diagnostic condition justified further spend after the mandatory stop |

The existing single-case v2 smoke was used for schema access because the frozen harness has no separate schema-only mode. For this first gate, only API/model/tool/schema acceptance and final runtime validity were considered. The same canonical case would have been run again as the separate behavioural smoke had the schema-access gate passed.

## Terra schema-access result

Artifact: `artifacts/track-c1b-evaluation/terra-schema-access.json`

| Metric | Result |
| --- | ---: |
| Logical cases | 1 |
| Passed | 0 |
| Failed | 1 |
| Provider requests | 2 |
| Initial attempts | 1 |
| Repair attempts | 1 |
| First-attempt strict/runtime success | 0/1 |
| Final strict/runtime success | 0/1 |
| Sanitised failure | `INVALID_OUTPUT` |
| Latency | 6,223 ms |
| Input tokens | 4,688 |
| Output tokens | 230 |
| Total tokens | 4,918 |
| Estimated cost | US$0.012136 |

The provider returned enough usage metadata to establish reachability and model access. Raw provider output was not persisted or exposed, so the evidence does not speculate about the exact invalid field beyond the trusted sanitised category.

## Spending evidence

| Model/run group | Estimated cost |
| --- | ---: |
| Terra schema-access smoke | US$0.012136 |
| Terra later gates | US$0.000000 |
| Luna | US$0.000000 |
| Sol | US$0.000000 |
| **C1B total** | **US$0.012136** |
| Authorised ceiling | US$5.000000 |
| Estimated unused ceiling | US$4.987864 |

The estimate uses the harness pricing snapshot dated 26 August 2026 and reported token usage. It is not a claim about final invoiced or dashboard-visible cost.

## Authority and safety proof

- `actualIntent` remained `null`.
- Runtime schema validation failed closed.
- Actual simulator permission remained `false`.
- Canonical simulator proof was not invoked because no provider interpretation passed.
- No scenario, immutable run, context version or conversation state was created or changed.
- No model-generated amount, month, classification, scenario ID or financial result entered application authority.
- The request contained the synthetic message, symbolic clarification/scenario state, trusted date and timezone only.
- It excluded financial context, balances, income, goals, employer records, the simulation ledger and authentication data.
- No provider response body, request body, hidden reasoning or secret was logged or stored as evidence.

## Post-run containment and verification

Immediately after failure, provider state returned to disabled with model selection cleared:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

The live evaluation process ended after the failed gate. All subsequent non-provider commands explicitly removed `OPENAI_API_KEY` from their environment.

Verification results:

| Gate | Result |
| --- | --- |
| Post-run tracked/repository/generated/client secret scan | PASS |
| Keyless production build | PASS — 22/22 static pages generated where applicable |
| Vitest | PASS — 32 files, 345/345 tests, 0 skipped |
| TypeScript | PASS |
| ESLint | PASS |
| Client dependency boundary | PASS |
| `git diff --check` | PASS after evidence creation |

No application source, provider prompt/schema, runtime validator, evaluation expectation, explanation plan, server renderer, Ask UI or simulator behaviour changed during this run.

## Model comparison and recommendation

No Terra/Luna comparison is possible. Terra failed the first mandatory gate; therefore Luna was correctly not run. Sol was not justified and received no request.

No model is approved or recommended for Future You production conversation interpretation from C1B.

## Remaining risk and next recommendation

The v2 contract is locally deterministic with the fake provider but still did not yield a valid canonical interpretation from live Terra at `low` reasoning. Because production evidence intentionally retains only sanitised failure categories, the exact validation mismatch is not available from this run.

Before Track C2, define and separately approve a narrow C1 diagnostic/refinement phase that can expose non-sensitive validation-code telemetry sufficient to identify the failing branch or field without storing raw provider output, user text, secrets or hidden reasoning. Any prompt/schema/runtime change must receive a new version and a new local gate before another separately authorised live evaluation.

Track C2 must not begin from this result. Phase B2 remains paused.
