# Track C1E Local Evidence Report

Date: 26 August 2026  
Final status: **C1E LOCAL TIMING CONTRACT CORRECTION — COMPLETE**  
Live OpenAI requests: **0**  
Live provider cost: **US$0**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Outcome

C1E implements the narrow combined correction approved after C1D. New interpretation turns now use:

```text
fy-conversation-interpretation/3.0.0
fy-conversation-intent/3.0.0
fy-conversation-timing-policy/1.0.0
fy-clarification-resolution-prompt/2.0.0
fy-clarification-resolution-schema/2.0.0
fy-interpretation-diagnostic/2.0.0
```

The v1 and v2 interpretation artifacts, v1 clarification artifacts and diagnostic v1 identifier remain
available for historical evidence. Explanation prompt/schema remain unchanged at `1.0.0`.

The canonical `next month` object has one authorised representation:

```json
{
  "quote": "next month",
  "kind": "NEXT_MONTH",
  "monthNumber": null,
  "year": null,
  "offsetMonths": 1
}
```

With trusted date 24 August 2026, the server resolves this to `2026-09`. A grounded quote with a
contradictory kind or numeric fields is now rejected before an application command or simulator call.

## 2. Recovery and preserved evidence

The completed C1D state was tagged before source, test or documentation changes:

```text
track-c1d-timing-diagnostic-complete-2026-08-26
e42c03aab85959f2d104efdf721a76f92f8fcd5f
```

The tag is annotated and dereferences to the same commit. Existing C0, C1A, C1B and C1C tags remain
unchanged. The accepted C1C live failure and C1D diagnostic reports were not edited. Their conclusions are
preserved: Terra's two canonical v2 outputs passed provider structure and failed broad runtime timing
semantics; C1D then proved the provider/runtime field gap and the separate quote/kind authority gap.

## 3. Implementation

### Added

- `src/application/conversation/timing-policy.ts`
- `tests/fixtures/conversation-timing-evaluation-corpus-v3.ts`
- `tests/timing-contract-v3.test.ts`
- `docs/track-c1e-timing-contract-correction.md`
- `docs/track-c1e-local-evidence-report.md`

### Updated

- `src/application/conversation/contracts.ts`
- `src/application/conversation/prompts.ts`
- `src/application/conversation/schemas.ts`
- `src/application/conversation/time-resolution.ts`
- `src/infrastructure/ai/fake-conversation-model-provider.ts`
- `src/infrastructure/ai/openai/interpretation-diagnostics.ts`
- `src/infrastructure/ai/openai/openai-responses-conversation-provider.ts`
- `src/infrastructure/ai/openai/provider-json-schemas.ts`
- `tests/conversation-orchestration.test.ts`
- `tests/helpers/timing-contract-diagnostics.ts`
- `tests/interpretation-contract-v2.test.ts`
- `tests/interpretation-diagnostics.test.ts`
- `tests/openai-conversation-provider.test.ts`
- `tests/timing-contract-diagnostic.test.ts`
- `package.json`
- `docs/future-you-evolution-details.md` (append-only)

No migration, seed source, generated database type, UI component, copy, visual baseline, simulator, Sarah
fixture, financial-context record or stored historical run was changed.

## 4. Timing-policy and schema proof

The canonical timing-policy module owns kinds, branch allowances, field/null/range rules, the bounded parser,
equivalence checks, runtime union, prompt table and repair guidance. Provider-schema generation consumes its
constants and descriptions. The active provider root remains a strict object without root `anyOf`; four
kind-specific timing alternatives are nested under each timing field.

Direct tests prove:

- all timing branch objects reject extra properties;
- all five properties are required;
- `NEXT_MONTH` has null month/year and offset exactly `1`;
- `MONTHS_AFTER_SELECTED` has null month/year and offset `1..120`;
- `NAMED_MONTH` has month `1..12` and null year/offset;
- `EXPLICIT_YEAR_MONTH` has month `1..12`, year `2000..2200` and null offset;
- invalid cross-kind combinations fail the provider schema and active Zod schema;
- the same schema governs month clarification; and
- both active schemas pass the existing strict-provider-schema validator.

The sanitised active interpretation-schema fingerprint is:

```text
93022ec341abe8706f8e59e08e6058d96119ef28c5121a8e95e58f3e645960b5
```

## 5. Quote parser and authority proof

The parser accepts only approved lexical expressions: next/noisy-next month, English named months, named
month plus year, approved `YYYY-MM`, numeric `N months later/after`, word `one`, and the existing wait-one-
month form. It rejects unknown text and classifies multiple/vague meanings as ambiguous.

After quote provenance is established, deterministic checks compare kind, month, year and offset. Tests
directly reject:

- `next month` represented as `NAMED_MONTH`;
- October represented with the wrong month number;
- October 2027 represented with the wrong year;
- one month later represented with offset two;
- unrecognised and ambiguous grounded quotes;
- `MONTHS_AFTER_SELECTED` without selected state; and
- that relative-to-selected kind on an initial purchase.

Only the server uses trusted timestamp, `Europe/London`, selected payment period and calendar rules to
produce `YYYY-MM`. The provider still cannot calculate or authoritatively supply a relative target month.

## 6. Diagnostic and repair proof

Diagnostic v2 adds all 19 approved timing-specific codes. Tests make every active code reachable and prove
that each timing diagnostic contains only:

- a closed stage/code;
- a safe timing JSON pointer;
- an approved timing kind or `UNKNOWN`/null; and
- booleans/version/attempt metadata.

No test diagnostic contains the user's timing quote or provider value. Invalid fields are distinguished as
required, forbidden, fixed-value or source-mismatch failures rather than the former broad supported-intent
code.

The adapter still allows exactly one repair. Its repair request now excludes the invalid/raw provider
response entirely and supplies safe path, code and fixed rule. Deterministic modes prove:

| Repair case | Provider calls | Outcome | Simulator calls |
| --- | ---: | --- | ---: |
| Wrong offset, then canonical | 2 | `SUCCEEDED` | 0 at adapter boundary |
| Wrong offset repeated | 2 | `IDENTICAL_FAILURE` / exhausted | 0 |
| Wrong offset, then wrong kind | 2 | `NEW_FAILURE` / exhausted | 0 |

Existing orchestration idempotency tests independently prove that an exact turn retry cannot duplicate a
message or run. Existing application tests prove only a validated provider result can invoke the simulator.

## 7. Clarification, corpus and fake-provider proof

The active month clarification is independently versioned at `2.0.0`, remains narrow and reuses the same
timing representation as initial and follow-up turns. `MONTHS_AFTER_SELECTED` is admitted only for a pending
month change with selected state; the provider cannot reinterpret the original intent.

The versioned v3 corpus contains 18 direct cases. It records expected kind/fields, diagnostic, simulator
permission, state and resolved month. The frozen C0 corpus and expanded v2 corpus are unchanged.

Evaluation results:

| Evaluation | Discovered | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Frozen C0 + expanded v2 + v3 timing tests | 112 | 112 | 0 | 0 |
| Repeated fake interpretation/clarification | 144 | 144 | 0 | 0 |
| Repeated fake explanation | 6 | 6 | 0 | 0 |

The fake harness retains 48 v2 cases across three repetitions. The v3 corpus is direct deterministic
boundary coverage and does not add full-message production answer keys.

## 8. Exhaustive C1D comparison after correction

The frozen C1D grid contains 3,024 representatives. Against v3:

| Result | Count |
| --- | ---: |
| Representative objects | 3,024 |
| Provider-schema valid | 32 |
| Runtime-contract valid | 32 |
| Source-equivalent for the grid's quote samples | 2 |
| Provider-valid but runtime-invalid | 0 |
| Source-equivalent with contradictory meaning | 0 |

The two runtime-only controls are intentional: source equivalence depends on untrusted user text, and
relative-to-selected authority depends on authenticated conversation state. Both now fail closed before the
simulator.

## 9. Financial and product regression proof

The full unit/regression suite includes the Slice 1–7, Track A, Track B1, Sarah employer/Benefits, exact-money,
renderer-authority, conversation, context-version and simulator tests.

| Gate | Files | Discovered | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full Vitest | 35 | 426 | 426 | 0 | 0 |
| Supabase integration, clean reset | 6 | 20 | 20 | 0 | 0 |
| PostgreSQL/pgTAP, clean reset | 6 | 273 | 273 | 0 | 0 |
| Mobile Chromium Playwright, authoritative rerun | — | 31 | 31 | 0 | 0 |

Coverage from the 426-test run:

| Metric | Coverage | Covered/total |
| --- | ---: | ---: |
| Statements | 77.96% | 2,749/3,526 |
| Branches | 66.44% | 1,927/2,900 |
| Functions | 80.40% | 558/694 |
| Lines | 80.42% | 2,523/3,137 |

Frozen £650, £500, £400 and October scenario expectations remain green. No financial expected value was
changed to obtain a pass. The browser still renders server results, and no new scenario or conversational
capability was introduced.

## 10. Environment and clean-state notes

The repository proved before reset:

- Supabase project ID `future-you`;
- local API port `54321`;
- local PostgreSQL port `54322`;
- listeners on those local ports;
- no local linked-project reference; and
- reset command uses `supabase db reset --local` after deterministic seed generation.

The initial sandboxed integration/pgTAP attempt could not connect to loopback/Docker and is not counted as a
product result. The first authorised local integration attempt then exposed accumulated prior test state:
16/20 passed and four onboarding/registration fixture assumptions failed. This was an environment-state
failure, not a timing implementation failure.

After explicit approval, the local-only reset applied all five migrations and canonical seed. Clean
integration passed 20/20. Integration creates test state, so a second approved local reset restored the
canonical seed before pgTAP, which passed 273/273. Before browser verification, the same local reset restored
canonical fixtures again. No hosted/shared database, service key for ordinary application processing,
dashboard edit, manual SQL or undocumented mutation was used.

The first full browser attempt passed 28 tests, then one responsive Benefits assertion timed out while the
screen still displayed its normal loading state; two later tests did not run. No wrong result was rendered.
After restoring only verification-generated PNG rewrites and resetting local fixtures, the complete
authoritative rerun passed 31/31 in 1.6 minutes. No timeout, visual expectation or product assertion was
weakened. Because C1E has no UI change, all generated evidence PNG rewrites were restored and no visual
baseline is part of the final diff.

## 11. Static, build and security gates

| Gate | Result |
| --- | --- |
| TypeScript | Pass; zero errors |
| ESLint | Pass; zero errors/warnings |
| Keyless production build | Pass; 22/22 static pages generated |
| Client dependency boundary | Pass; no server-only simulator/store identifiers in client chunks |
| Generated Supabase seed/types | Current |
| Secret boundary | Pass; no configured key in tracked, repository, generated or client artifacts |
| `git diff --check` | Pass |

The full browser suite also performed a production build successfully. Test runner IPC and loopback/Docker
access required approved execution outside the filesystem/network sandbox; the same commands then passed.

The final secret-boundary pass initially detected the configured key bytes in two ignored Turbopack
development-cache files. The scan reported filenames only and did not print key bytes. Both exact disposable
cache files were deleted, after which the same scan proved the key absent from tracked files, non-ignored
repository files, all remaining generated artifacts and client bundles. No source, test, database or user
data was removed. This was a local generated-artifact containment correction; no provider request occurred.

## 12. Provider containment

Before evaluation, shell state reported:

```text
provider_enabled=false
model_selection=unset
```

Every C1E evaluation used deterministic fakes. No Responses API request was made, no model was selected,
no live artifact was created and provider spend is US$0. `store: false`, forced strict function selection,
no built-in tools, `parallel_tool_calls: false`, server-owned state and provider data minimisation remain in
the adapter and are covered by tests.

## 13. Remaining risks and recommendation

- Local schema/runtime/repair correctness does not establish Terra's live adherence to v3.
- The deterministic grammar intentionally excludes arbitrary date language and word-number offsets beyond
  the existing word `one` case.
- Provider schema support has been checked locally against the project's strict-schema validator; the next
  live smoke is still required to prove actual model/schema behaviour.
- C1E does not approve Terra, Luna, Sol or any production model.

The proposed next action is separately authorised live validation only:

```text
model: gpt-5.6-terra
reasoning: low
logical cases: 1 canonical £650 / next-month case
requests: 1 initial + at most 1 existing repair
maximum estimated spend: US$0.10
```

That live request was not made. Do not run a corpus, Luna, Sol, Track C2 or Phase B2 automatically.
