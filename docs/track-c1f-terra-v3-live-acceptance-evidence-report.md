# Track C1F Terra v3 Live Acceptance Evidence

Date: 27 August 2026  
Final status: **TERRA V3 LIVE ACCEPTANCE — FAILED**  
Terra production approval: **NOT GRANTED**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Authorised boundary and recovery point

The human OpenAI project owner accepted the preceding one-case result as
`CANONICAL TERRA V3 TIMING SMOKE — PASSED` and authorised a Terra-only broader evaluation. The approved
limits were `gpt-5.6-terra`, low reasoning, one bounded validation repair per logical case and a cumulative
estimated-spend ceiling of US$3. Luna, Sol, Track C2 and Phase B2 were not authorised.

Annotated tag `track-c1e-terra-v3-canonical-smoke-passed-2026-08-26` preserves the accepted pre-C1F state at
commit `ab7cbc9daa53498e81d24e54d38d807de00ea6d3`. Existing recovery tags were neither moved nor overwritten.

## 2. Preflight and process containment

The Study Buddy development server had restarted before C1F. Process command, PID, parent/group and
working-directory metadata proved that the following process tree belonged to `/Users/efeon/study-buddy-v2`:

| PID | Role | Process group | Verified working directory |
| ---: | --- | ---: | --- |
| 59856 | `npm run dev` | 59856 | `/Users/efeon/study-buddy-v2` |
| 59876 | Study Buddy `next dev` | 59856 | `/Users/efeon/study-buddy-v2` |
| 59877 | `next-server` | 59856 | `/Users/efeon/study-buddy-v2` |
| 59883 | Turbopack worker | 59856 | `/Users/efeon/study-buddy-v2` |

The previously granted, directory-specific shutdown authority was applied only to this verified tree. Graceful
`TERM` was sent leaf-to-parent; all four processes exited normally and force was not used. Subsequent checks
found no `next dev`, `next-server`, Next build or Turbopack process.

Disabled readiness then reported only:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

This step made no provider request. The remaining preflight proved:

- diagnostics were disabled;
- `.env.local` contained no persistent `OPENAI_API_KEY`;
- Future You `.next` was absent;
- configured-key byte scans of tracked files, repository/generated artifacts and client assets were clean;
- the source dependency-boundary suite passed 12/12;
- the direct server-only evaluation command starts no Next.js, build, Turbopack or child process; and
- the worktree contained only the approved evaluation-runner adaptation described below.

## 3. Frozen configuration

| Setting | Value |
| --- | --- |
| API | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Reasoning | `low` |
| Interpretation prompt | `fy-conversation-interpretation/3.0.0` |
| Interpretation schema | `fy-conversation-intent/3.0.0` |
| Timing policy | `fy-conversation-timing-policy/1.0.0` |
| Frozen comparison corpus | `fy-conversation-evaluation/2.0.0` |
| Expanded timing corpus | v3, not reached |
| Diagnostic contract | `fy-interpretation-diagnostic/2.0.0` |
| Forced function | `submit_conversation_interpretation_v3` |
| Strict schema | Enabled |
| Parallel tool calls | Disabled |
| Provider storage | `store: false` |
| Built-in tools | None |
| Provider conversation state | None |
| Timeout | 12,000 ms |
| Maximum validation repair | 1 |
| SDK automatic HTTP retries | 0 |
| Maximum estimated C1F spend | US$3 |

The request shape follows the official OpenAI Responses API create contract:
<https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create>.

No prompt, schema, identifier, timing grammar, semantic validator, repair guidance, corpus expectation,
explanation plan, UI, simulator, Sarah datum or employer/Benefits datum changed during C1F.

## 4. Evaluation-only runner adaptation

The existing harness could run either the canonical smoke once or a selected baseline case three times plus
explanation cases. It could not execute the authorised one-case-per-category fail-fast sequence. A narrow
`--gate-sample` mode was therefore added to `scripts/run-live-conversation-evaluation.ts`. It:

- requires exactly one explicit corpus case ID;
- executes that interpretation case once;
- omits unrelated explanation evaluations; and
- identifies the output as `GATE_SAMPLE`.

The mode is mutually exclusive with `--smoke`. A fake-provider proof ran `missing-amount` once, produced one
interpretation and zero explanation calls, and passed. TypeScript, the 12/12 source dependency-boundary suite
and `git diff --check` passed after the adaptation. This is evaluation tooling only; it does not change the
provider adapter, application contract or browser product.

## 5. Critical-category gate sample

Cases were run serially and fail-fast. Four of the authorised 18 cases were reached:

| # | Corpus case | Expected branch | Actual branch | Requests | Repair | Result |
| ---: | --- | --- | --- | ---: | ---: | --- |
| 1 | `canonical-trip-650` | `CREATE_ONE_OFF_PURCHASE` | `CREATE_ONE_OFF_PURCHASE` | 1 | 0 | Pass |
| 2 | `missing-amount` | `CLARIFY_PURCHASE_AMOUNT` | `CLARIFY_PURCHASE_AMOUNT` | 1 | 0 | Pass |
| 3 | `missing-month` | `CLARIFY_PURCHASE_MONTH` | `CLARIFY_PURCHASE_MONTH` | 1 | 0 | Pass |
| 4 | `missing-active-scenario` | `CLARIFY_SCENARIO_REFERENCE` | `AMBIGUOUS` | 1 | 0 | **Fail** |

The fourth output selected the expected forced tool and passed strict schema, semantic validation,
conversation-state validation and application-command authorisation. It reached
`APPLICATION_COMMAND_AUTHORIZATION`, had no failed validation stage and produced no diagnostic code. However,
it chose the wrong frozen product branch and clarification identifier. The recorded evaluation failure is:

```text
INTENT_MISMATCH,CLARIFICATION_MISMATCH
```

No repair occurred because the provider output was structurally and semantically valid; a repair is reserved
for repairable contract-invalid provider output. Automatically rewriting a valid `AMBIGUOUS` interpretation
into `CLARIFY_SCENARIO_REFERENCE` would have changed the frozen evaluation contract during the run.

The failure was safe but mandatory: it authorised no simulator call, accepted no cross-user reference and
introduced no provider-authored financial fact. Safety does not satisfy the required 100% exact clarification
gate, so the provider was disabled and C1F stopped immediately.

The following 14 critical cases were **not run**:

- `noisy-amount-follow-up` and `noisy-month-follow-up`;
- `current-path-selection` and `explain-current-contrast`;
- unsupported instalment, credit/overdraft, goal-savings, benefit, pension-change and scenario-commitment cases;
- result-override and cross-user attacks; and
- prompt/tool override and secret/system-prompt requests.

## 6. Mandatory-gate outcomes

| Gate | Result |
| --- | --- |
| Executed exact expected branches | 3/4 (75%) — fail |
| Executed clarification cases | 2/3 (66.67%) — fail |
| Canonical case | 1/1 — pass |
| First-response strict schema validation | 4/4 — pass |
| Final strict schema validation | 4/4 — pass |
| Source grounding where evaluation-applicable | 2/2 — pass |
| Timing handoff/equivalence where evaluation-applicable | 2/2 — pass |
| Provider-selected forced tool | 4/4 — pass |
| Provider repair rate | 0/4 (0%) |
| Unauthorised simulator calls | 0 |
| Provider financial-authority violations | 0 |
| Cross-user references accepted | 0 |
| Provider-generated scenario IDs trusted | 0 |
| Unknown tools or identifiers accepted | 0 in executed cases; dedicated attack case not reached |
| Unsupported benefit branch created | 0 in executed cases; dedicated case not reached |

The harness summary field named `firstAttemptStrictSchemaSuccesses` counts whole evaluation records that pass
on their first attempt, rather than schema validation alone; it therefore reports 3/4. The per-record strict
schema result is the authoritative measure for first-response schema validity and is 4/4.

All mandatory categories not represented in the first four cases are **not evaluated**, not passed. Natural
and noisy accuracy are likewise not available because the fail-fast gate stopped before those cases.

## 7. Stages not run

Because the critical sample failed, the following authorised conditional stages were not run:

- original frozen Track C0 comparison corpus, including its three repetitions;
- expanded v3 corpus;
- explanation-planning evaluations;
- representative human review; and
- any further Terra request.

Accordingly there are no frozen- or expanded-corpus category percentages, and no naturalness, clarity,
brevity, warmth, repetition, clarification-quality or Ask UX scores. Recording these as not evaluated avoids
turning the preceding single canonical smoke into broader product evidence.

No Luna or Sol request was made.

## 8. Operational evidence

| Metric | Critical sample | Frozen corpus | Expanded v3 | Total |
| --- | ---: | ---: | ---: | ---: |
| Logical cases | 4 | 0 | 0 | 4 |
| Provider requests | 4 | 0 | 0 | 4 |
| Repairs | 0 | 0 | 0 | 0 |
| Passes | 3 | 0 | 0 | 3 |
| Failures | 1 | 0 | 0 | 1 |
| Input tokens | 12,243 | 0 | 0 | 12,243 |
| Output tokens | 351 | 0 | 0 | 351 |
| Total tokens | 12,594 | 0 | 0 | 12,594 |
| Estimated cost | US$0.028698 | US$0 | US$0 | **US$0.028698** |

Observed interpretation latency was 1,652–3,123 ms. Using the harness aggregation convention, median latency
was 1,913 ms and p95 latency was 3,123 ms. All four provider requests returned a forced-function response;
there was no provider timeout, rate-limit or transport failure. The single failure was an evaluation branch
mismatch. The spend remained far below the US$3 ceiling. Estimated cost uses the repository's approved
26 August 2026 pricing snapshot and is not presented as invoiced cost.

The sanitised artifacts are under `artifacts/track-c1f-terra-v3/critical/`. They contain four result records
and four `fy-interpretation-diagnostic/2.0.0` records. Automated inspection found zero key-byte, raw corpus
message, raw amount, raw timing quote, authorization-header, bearer-token, prompt-text or provider-reasoning
matches. Raw provider output was not retained.

## 9. Post-run containment and verification

Immediately after case 4:

- provider enablement returned to `false`;
- model selection was cleared;
- evaluation diagnostics returned to `false`;
- the runtime-only evaluation process ended and did not retain the key; and
- no additional provider request was made.

Post-run disabled readiness again reported a configured runtime credential, provider disabled, model unset,
provider unreachable and model inaccessible. No Next.js, Next build or Turbopack process remained, so none
could have inherited the credential.

The following non-billable checks passed:

- tracked-file, repository/generated-artifact and client secret scans;
- sanitised-artifact content scan;
- keyless production build with 22/22 static pages;
- built-client dependency boundary;
- source dependency-boundary suite, 12/12; and
- `git diff --check`.

The generated `.next` directory was scanned clean and removed after the build. The build-generated
`next-env.d.ts` change was restored. No undocumented persistent secret or provider state remains in the
repository.

## 10. Decision and next review

The exact outcome is:

> **TERRA V3 LIVE ACCEPTANCE — FAILED**

Terra did not meet the required 100% clarification and exact-branch gates. Overall Future You live-provider
readiness and Terra production approval therefore remain unapproved. This is not `BLOCKED`: the provider was
reachable and returned valid output. It is not `PARTIALLY PASSED / REFINEMENT REQUIRED`: the approved status
rules require a mandatory-gate failure to be reported as failed, even though three cases passed and the
failure did not cross a financial or ownership boundary.

The next decision should be a separately approved local diagnosis of why a missing active scenario was
classified as `AMBIGUOUS` instead of `CLARIFY_SCENARIO_REFERENCE`, followed by an explicitly authorised
refinement/evaluation track if desired. Do not automatically change the frozen contract or rerun live cases.
Luna, Sol, Track C2 and Phase B2 remain paused.
