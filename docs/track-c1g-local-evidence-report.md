# Track C1G Local Evidence Report

Date: 27 August 2026  
Final status: **TRACK C1G — COMPLETE, LOCAL DIAGNOSTIC ONLY**  
Production correction: **NOT IMPLEMENTED**  
Live OpenAI requests: **0**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Scope and recovery

C1G diagnosed the accepted C1F `AMBIGUOUS` versus `CLARIFY_SCENARIO_REFERENCE` failure without modifying
the production prompt, schema, runtime validator, application behavior, corpus expectation or simulator.

Annotated tag `track-c1f-terra-v3-clarification-failure-2026-08-26` preserves the complete accepted C1F state
at `5e8b709d6356f1787d782c313ee42183854c3cc1`. The tag contains the unchanged C1F report, four sanitised
artifacts, operational evidence and fail-fast evaluation tooling. No prior tag was moved or overwritten.

## 2. Files added

- `docs/track-c1g-scenario-reference-clarification-diagnostic.md`
- `docs/track-c1g-local-evidence-report.md`
- `tests/fixtures/scenario-reference-clarification-diagnostic.ts`
- `tests/scenario-reference-clarification-diagnostic.test.ts`
- append-only C1G entry in `docs/future-you-evolution-details.md`

There are no production files in this list. Verification-generated PNG rewrites and `next-env.d.ts` were
restored because C1G has no UI or Next.js change. The generated `.next` cache was scanned and removed.

## 3. Exact diagnostic finding

The failed synthetic turn was:

```text
message: What about £500?
pending clarification: none
available scenarios: none
selected scenario: none
expected: CLARIFY_SCENARIO_REFERENCE / SCENARIO_REFERENCE
simulator allowed: no
```

The provider received correct and sufficient scenario-state information. It did not receive a server-owned
symbolic operation-family classification; that inference remained provider work from the raw message.

The failure is jointly explained by:

1. prompt v3 retaining a general scenario-reference rule while dropping v2's exact amount-follow-up contrast
   and explicit ambiguity exclusion;
2. the static provider and Zod schemas accepting both generic ambiguity and exact clarification;
3. runtime semantic/state validation having no exact-clarification precedence invariant; and
4. the application accepting `AMBIGUOUS` as a generic clarification without creating the structured scenario
   pending state.

The corpus expectation matches the product contract. Scenario state was neither missing nor incorrect.

## 4. Test-only reproduction

The C1G fixtures cover:

- amount follow-up without a selected scenario → incorrect generic ambiguity;
- timing follow-up without a selected scenario → incorrect generic ambiguity;
- explanation request without a selected run → incorrect generic ambiguity;
- the correct exact scenario-reference clarification for all three;
- a genuinely unclear operation where generic ambiguity remains correct; and
- representative supported, unsupported, wrong-supported, selection and explanation outputs.

For amount, timing and explanation messages, an exhaustive local matrix checks selected, explicit-label,
unselected-without-label and no-scenario states. In all 12 states, both `AMBIGUOUS` and
`CLARIFY_SCENARIO_REFERENCE` currently pass schema, semantics, state validation and application-command
authorisation. This proves the overlap is a production-invariant gap rather than a one-case JSON issue.

Mocked Responses adapter tests reproduce the generic branch in one response with the existing repair limit
enabled. Each result has `repairOutcome: NOT_APPLICABLE`, no second request and no simulator invocation.
Application tests prove the exact branch creates the structured pending clarification while ambiguity creates
only the generic `SUPPORTED_ACTION` response and loses the continuation state.

## 5. Why repair did not run

Repair is eligible only after an `INVALID_OUTPUT` tool, JSON, schema, semantic, grounding, timing or state
failure. The live branch passed all those stages and generated no diagnostic code. The frozen evaluation
mismatch was detected only after provider completion, outside the repair loop.

A future semantic diagnostic such as `GENERIC_AMBIGUITY_WHEN_EXACT_CLARIFICATION_AVAILABLE` is viable only
when bounded server-owned evidence proves the operation family and that scenario reference is the sole gap.
No such code or repair was implemented in C1G.

## 6. Recommended correction and versioning

The smallest enforceable correction is a narrow combined option:

- restore exact prompt precedence and contrastive examples;
- add bounded server-owned follow-up evidence for approved amount, month and explanation families;
- reject generic ambiguity only when that evidence proves an exact scenario gap;
- emit one precise sanitised diagnostic and allow the existing single repair; and
- fail closed if repair does not return a valid exact branch.

Recommended new identifiers for a separately approved correction are:

- interpretation prompt `fy-conversation-interpretation/4.0.0`;
- interpretation schema/runtime contract `fy-conversation-intent/4.0.0`;
- diagnostic contract `fy-interpretation-diagnostic/3.0.0`; and
- diagnostic corpus `fy-scenario-reference-clarification/1.0.0`.

Timing policy 1.0.0, clarification-resolution 2.0.0 and explanation 1.0.0 remain unchanged.

## 7. Verification evidence

All authoritative commands ran with `OPENAI_PROVIDER_ENABLED=false`, `OPENAI_MODEL` unset,
`OPENAI_EVALUATION_DIAGNOSTICS_ENABLED=false` and `OPENAI_API_KEY` removed from the command environment.

| Gate | Files/cases | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| C1G focused reproduction | 1 file / 20 tests | 20 | 0 | 0 | Pass |
| Focused clarification/provider/application boundary | 6 files / 103 tests | 103 | 0 | 0 | Pass |
| Full Vitest regression | 36 files / 446 tests | 446 | 0 | 0 | Pass |
| Frozen C0 + expanded v2 + v3 corpus tests | 3 files / 112 tests | 112 | 0 | 0 | Pass |
| Repeated fake evaluation | 144 interpretation + 6 explanation | 150 | 0 | 0 | Pass |
| Clean-state Supabase integration | 6 files / 20 tests | 20 | 0 | 0 | Pass |
| Clean-state pgTAP | 6 files / 273 tests | 273 | 0 | 0 | Pass |
| Mobile Chromium Playwright | 31 tests | 31 | 0 | 0 | Pass |
| TypeScript | 1 command | 1 | 0 | 0 | Pass |
| ESLint | 1 command | 1 | 0 | 0 | Pass |
| Keyless production build | 22 static pages | 22 | 0 | 0 | Pass |
| Database seed/type drift | 1 command | 1 | 0 | 0 | Pass |
| Built-client dependency boundary | 1 command | 1 | 0 | 0 | Pass |
| Secret boundary | tracked/repository/generated/client | 4 clean scopes | 0 | 0 | Pass |
| `git diff --check` | 1 command | 1 | 0 | 0 | Pass |

Coverage from the complete 446-test run:

| Metric | Result |
| --- | ---: |
| Statements | 78.19% (2,761/3,531) |
| Branches | 67.03% (1,944/2,900) |
| Functions | 80.43% (559/695) |
| Lines | 80.67% (2,534/3,141) |

No authoritative suite skipped a test.

## 8. Database-test chronology

The first sandboxed integration attempt could not access Docker or local loopback and was discarded as an
environment failure. The authorised local attempt then exposed state left by earlier test runs: 18/20 passed,
while onboarding and Alex-current-context assumptions found existing state.

Before resetting, configuration and sanitised `supabase status` checks proved:

- project ID `future-you`;
- API `127.0.0.1:54321`;
- PostgreSQL `127.0.0.1:54322`;
- reset command explicitly uses `supabase db reset --local`; and
- migrations and seed are committed/reproducible.

The local-only reset applied all five migrations and the canonical seed without manual SQL/dashboard work.
The authoritative integration rerun then passed 20/20.

Because integration tests persist fixture changes, the first subsequent pgTAP run encountered those expected
count collisions. A second identical local-only reset restored the canonical clean state; the unchanged pgTAP
suite then passed 273/273. No hosted/shared database, RLS policy, test expectation or fixture value changed.

## 9. Browser, build and security evidence

The full mobile Chromium suite passed 31/31, covering Slice 2–7, Track A registration and Track B1 Sarah story.
Its production build compiled, type-checked and generated 22/22 static pages. The suite made no live provider
request because the provider was disabled and no key/model was supplied.

Post-build checks proved:

- built client chunks contain no simulator/store server-only identifiers;
- no configured key exists in tracked files, repository files, generated artifacts or client bundles;
- no Next.js/Turbopack process remains;
- `.next` was clean and then removed; and
- all browser-generated PNG rewrites were restored because no visual baseline changed.

## 10. Final decision and next gate

C1G satisfies its local diagnostic completion gate. It does not approve or implement a correction, does not
approve Terra and does not reopen Track C2 or Phase B2.

The proposed next step is a separately approved local correction slice implementing the bounded combined
option in the diagnostic document. Only after that local slice passes should a one-case Terra validation be
considered:

```text
What about £500?
```

Proposed limits are low reasoning, one initial request, at most one bounded repair, no simulator, and maximum
estimated spend **US$0.10**. No such live request occurred in C1G.
